'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Helper function to capitalize titles properly
function formatListingTitle(title: string): string {
  if (!title) return '';
  const minorWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'with', 'in']);
  
  return title
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && minorWords.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Simple deterministic pseudo-random jitter for privacy on offers/requests (~0.5 - 1 mile offset)
function getJitteredCoords(lat: number, lng: number, seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = ((hash % 100) / 10000) * (hash % 2 === 0 ? 1 : -1);
  const lngOffset = (((hash >> 3) % 100) / 10000) * (hash % 3 === 0 ? 1 : -1);
  return { lat: lat + latOffset, lng: lng + lngOffset };
}

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { data: session } = useSession();

  const [listing, setListing] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [otherListings, setOtherListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReviewsItem, setActiveReviewsItem] = useState<any>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [submittingReview, setSubmittingReview] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListingDetail();
    }
  }, [id]);

  // Load Google Maps Script dynamically using your radius search key from env
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    if ((window as any).google && (window as any).google.maps) {
      setMapLoaded(true);
      return;
    }

    if (document.getElementById('google-maps-script')) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize Map once listing and map script are ready
  useEffect(() => {
    if (!mapLoaded || !listing) return;

    const lat = listing.latitude || listing.author?.latitude;
    const lng = listing.longitude || listing.author?.longitude;

    if (lat && lng) {
      const isCommercial = listing.type === 'COMMERCIAL';
      let pinLat = Number(lat);
      let pinLng = Number(lng);

      // If it's an offer or request, shift coordinates slightly to protect author privacy
      if (!isCommercial) {
        const jittered = getJitteredCoords(pinLat, pinLng, listing.id || 'offer');
        pinLat = jittered.lat;
        pinLng = jittered.lng;
      }

      const mapElement = document.getElementById('listing-google-map');
      if (mapElement && (window as any).google) {
        const map = new (window as any).google.maps.Map(mapElement, {
          center: { lat: pinLat, lng: pinLng },
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        new (window as any).google.maps.Marker({
          position: { lat: pinLat, lng: pinLng },
          map: map,
          title: isCommercial ? listing.title : 'Approximate Location',
        });
      }
    }
  }, [mapLoaded, listing]);

  const fetchListingDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) throw new Error('Failed to fetch listing details');
      const data = await res.json();
      const listingData = data.listing || data;
      
      if (listingData.title) {
        listingData.title = formatListingTitle(listingData.title);
      }

      setListing(listingData);
      setReviews(listingData.reviews || []);

      const authorId = listingData.authorId || listingData.author?.id;
      if (authorId) {
        fetchOtherListings(authorId, listingData.id);
      }
    } catch (err) {
      console.error(err);
      setListing(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherListings = async (authorId: string, currentId: string) => {
    try {
      const res = await fetch(`/api/listings?authorId=${authorId}`);
      if (res.ok) {
        const data = await res.json();
        const allListings = data.listings || data;
        if (Array.isArray(allListings)) {
          const filtered = allListings.filter((l: any) => {
            const lAuthorId = l.authorId || l.author?.id;
            return lAuthorId === authorId && l.id !== currentId;
          });
          setOtherListings(filtered);
        }
      }
    } catch (err) {
      console.error('Failed to fetch other listings', err);
    }
  };

  const handleDeleteListing = async () => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete listing.');
      router.push('/marketplace');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push('/signup');
      return;
    }
    setSubmittingReview(true);
    setError('');

    try {
      const res = await fetch(`/api/listings/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review.');

      setComment('');
      fetchListingDetail();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReplySubmit = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/listings/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, reply: replyText[reviewId] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post reply.');

      setReplyText((prev) => ({ ...prev, [reviewId]: '' }));
      fetchListingDetail();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium text-lg">
        Loading listing details...
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Listing Not Found</h1>
        <p className="text-slate-600 text-sm mb-6">This listing may have been removed or is no longer available.</p>
        <Link
          href="/marketplace"
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md"
        >
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const reviewCount = reviews.length;
  const ratingVal = reviewCount > 0 
    ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewCount).toFixed(1) 
    : 'New';

  const authorSlug = listing.authorId || listing.author?.name?.toLowerCase().replace(/\s+/g, '-') || 'user';
  const authorName = listing.author?.name || 'Community Member';
  const authorEmail = listing.author?.email || `${authorName.toLowerCase().replace(/\s+/g, '')}@growtogive.org`;
  
  const subject = encodeURIComponent(`Regarding your GrowToGive listing: ${listing.title}`);
  const body = encodeURIComponent(`Hi ${authorName},\n\nI saw your listing "${listing.title}" on GrowToGive and am interested in connecting.\n\nBlessings!`);

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${authorEmail}&su=${subject}&body=${body}`;
  const outlookUrl = `https://outlook.live.com/owa/?path=/mail/action/compose&to=${authorEmail}&subject=${subject}&body=${body}`;

  const currentUserEmail = session?.user?.email?.toLowerCase()?.trim();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole?.toUpperCase() === 'ADMIN';
  const isAuthor = Boolean(currentUserEmail && listing.author?.email?.toLowerCase()?.trim() === currentUserEmail);
  const canModify = isAuthor || isAdmin;
  
  const hasAlreadyReviewed = reviews.some((rev: any) => {
    const revAuthorEmail = (rev.author?.email || rev.authorEmail || '').toLowerCase().trim();
    const revAuthorId = rev.authorId || rev.author?.id;
    return Boolean(
      (currentUserEmail && revAuthorEmail && revAuthorEmail === currentUserEmail) ||
      (revAuthorId && session?.user && (revAuthorId === (session.user as any).id))
    );
  });

  const isCommercial = listing.type === 'COMMERCIAL';
  const displayCity = (listing.city || listing.author?.city || '').trim() || 'General City';
  const displayChurch = (listing.churchName || listing.author?.churchName || listing.author?.church || '').trim() || 'Grace Family Church';

  const createdDate = new Date(listing.createdAt || Date.now());
  const memberSinceDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const expDate = new Date(createdDate);
  expDate.setDate(expDate.getDate() + 14);
  const expirationDateFormatted = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const displayDistance = `${listing.distance !== undefined && listing.distance !== null ? listing.distance : 0} mi`;
  const priceDisplay = !isCommercial ? `GB: ${Number(listing.priceInBucks || 0).toFixed(2)}` : null;
  const hasCoords = Boolean(listing.latitude || listing.author?.latitude);

  const storefrontAddress = listing.location || '';
  const googleMapsSearchUrl = storefrontAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storefrontAddress)}` : '#';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <header className="w-full bg-white border-b-2 border-blue-500 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center gap-4">
          <Link href="/marketplace" className="flex items-center gap-2.5">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-black tracking-tight text-slate-900">GrowToGive</span>
          </Link>
          <div className="flex items-center gap-3">
            {canModify && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/listings/${listing.id}/edit`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Edit Listing
                </Link>
                <button
                  onClick={handleDeleteListing}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
            <Link
              href="/marketplace"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
            >
              ← Back to Marketplace
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 pt-10 space-y-8">
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          {listing.imageUrl && (
            <div className="h-80 w-full bg-slate-100 relative">
              <img
                src={listing.imageUrl}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e: any) => { e.target.style.display = 'none'; }}
              />
              <span className={`absolute top-6 right-6 px-3 py-1 rounded text-xs font-normal uppercase tracking-wide border shadow-sm ${
                isCommercial ? 'bg-sky-100 text-blue-800 border-sky-300' : 'bg-slate-100 text-black border-slate-200'
              }`}>
                {listing.type}
              </span>
            </div>
          )}

          <div className="p-8 space-y-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 leading-tight">
                {listing.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-slate-100 text-xs font-semibold text-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 uppercase tracking-wider">
                  {listing.category || 'Goods'}
                </span>
                <span className="text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                  <span className="text-blue-600 inline-block filter hue-rotate-15">✝️</span>
                  <span>{displayCity} &gt; {displayChurch}</span>
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-500 font-normal">
                {isCommercial ? (
                  <span>Member Since: {memberSinceDate}</span>
                ) : (
                  <>
                    <span>Expires: {expirationDateFormatted}</span>
                    <span className="text-slate-900 font-bold">{priceDisplay}</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h2>
              <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {isCommercial && listing.businessHours && (
              <div className="p-5 bg-sky-50/50 border border-sky-200 rounded-2xl space-y-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-sky-800 mb-1">Business Hours</h2>
                  <p className="text-slate-800 font-medium text-sm whitespace-pre-line">
                    {listing.businessHours}
                  </p>
                </div>

                {storefrontAddress && (
                  <div className="pt-3 border-t border-sky-200/60">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-sky-800 mb-1">Storefront Address</h2>
                    <a
                      href={googleMapsSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold text-sm underline transition-colors"
                    >
                      <span>📍</span>
                      <span>{storefrontAddress}</span>
                      <span className="text-xs">↗</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                {session ? (
                  <Link href={`/users/${authorSlug}`} className="text-emerald-600 hover:underline font-bold flex items-center gap-1.5 text-base">
                    👤 {authorName}
                  </Link>
                ) : (
                  <span className="text-slate-700 font-bold flex items-center gap-1.5 text-base">
                    👤 {authorName}
                  </span>
                )}
                <span className="text-xs font-normal text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-md">
                  📍 {displayDistance} away
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveReviewsItem(listing)}
                  className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-2xl transition-colors cursor-pointer group shadow-xs shrink-0"
                >
                  <span className="text-amber-500 font-black text-base">★</span>
                  <span className="text-sm font-black text-slate-900 group-hover:text-amber-800">{ratingVal}</span>
                  <span className="text-xs text-slate-500 font-bold">({reviewCount})</span>
                </button>

                <button
                  onClick={() => {
                    if (!session) {
                      router.push('/signup');
                    } else {
                      setShowContactModal(true);
                    }
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm text-center transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>✉️</span> Contact Member
                </button>
              </div>
            </div>
          </div>

          {/* Google Map Section */}
          {hasCoords ? (
            <div className="border-t border-slate-200 p-8 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  {isCommercial ? 'Business Location' : 'Approximate Location (Author Address Area)'}
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  {isCommercial ? 'Exact address pin' : 'Shifted slightly for author privacy'}
                </span>
              </div>
              <div id="listing-google-map" className="w-full h-72 rounded-2xl border border-slate-200 bg-slate-200 shadow-inner"></div>
            </div>
          ) : (
            <div className="border-t border-slate-200 p-6 bg-slate-50 text-center text-xs text-slate-400">
              Location coordinates not available for mapping.
            </div>
          )}
        </div>

        {/* Leave Feedback Section */}
        {!isAuthor && session && !hasAlreadyReviewed && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-4">Leave Feedback</h3>
            {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>}
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rating:</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-200 bg-white text-sm rounded-xl font-bold"
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Very Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Fair</option>
                  <option value="1">1 - Poor</option>
                </select>
              </div>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                className="w-full px-4 py-3 border border-slate-200 bg-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}

        {/* My Other Listings Section */}
        {otherListings.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-900">My Other Listings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {otherListings.map((item: any) => {
                const itemIsCommercial = item.type === 'COMMERCIAL';
                const itemPrice = !itemIsCommercial ? `GB: ${Number(item.priceInBucks || 0).toFixed(2)}` : 'Commercial';
                return (
                  <Link
                    key={item.id}
                    href={`/listings/${item.id}`}
                    className="group border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col"
                  >
                    {item.imageUrl ? (
                      <div className="h-40 w-full bg-slate-100 relative overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e: any) => { e.target.style.display = 'none'; }}
                        />
                        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border shadow-xs ${
                          itemIsCommercial ? 'bg-sky-100 text-blue-800 border-sky-300' : 'bg-white text-slate-800 border-slate-200'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                    ) : (
                      <div className="h-28 w-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                        No Image
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                          {item.category || 'Goods'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1.5 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                          {formatListingTitle(item.title)}
                        </h4>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 font-medium">
                        <span className="text-slate-500 truncate max-w-[100px]">{item.city || displayCity}</span>
                        <span className="font-bold text-slate-900">{itemPrice}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Community Reviews Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="mt-2 space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Community Reviews ({reviews.length})</h4>
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400">No reviews yet for this listing.</p>
            ) : (
              reviews.map((rev: any) => {
                const revAuthorEmail = (rev.author?.email || rev.authorEmail || '').toLowerCase().trim();
                const isReviewAuthor = Boolean(
                  (currentUserEmail && revAuthorEmail && revAuthorEmail === currentUserEmail) ||
                  (rev.authorId && session?.user && (rev.authorId === (session.user as any).id))
                );
                const isEditing = editingReviewId === rev.id;

                return (
                  <div key={rev.id} className="p-4 border border-slate-200 bg-slate-50 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-900">{rev.author?.name || 'Member'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-500 font-black">{'★'.repeat(rev.rating)}</span>
                        {session && isReviewAuthor && !isEditing && (
                          <button
                            onClick={() => {
                              setEditingReviewId(rev.id);
                              setEditRating(rev.rating);
                              setEditComment(rev.comment);
                            }}
                            className="text-[11px] font-bold text-emerald-600 hover:underline ml-2"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 pt-2">
                        <select
                          value={editRating}
                          onChange={(e) => setEditRating(Number(e.target.value))}
                          className="px-2 py-1 border border-slate-200 bg-white text-xs rounded-lg font-bold"
                        >
                          <option value="5">5 - Excellent</option>
                          <option value="4">4 - Very Good</option>
                          <option value="3">3 - Average</option>
                          <option value="2">2 - Fair</option>
                          <option value="1">1 - Poor</option>
                        </select>
                        <textarea
                          rows={2}
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 bg-white text-xs rounded-xl"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/listings/${id}/reviews`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ reviewId: rev.id, rating: editRating, comment: editComment }),
                                });
                                if (!res.ok) throw new Error('Failed to update review');
                                setEditingReviewId(null);
                                fetchListingDetail();
                              } catch (err: any) {
                                alert(err.message);
                              }
                            }}
                            className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-lg"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingReviewId(null)}
                            className="px-3 py-1 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-600 text-xs">{rev.comment}</p>
                    )}

                    {rev.reply && !isEditing && (
                      <div className="mt-2 p-3 bg-white border-l-4 border-emerald-600 rounded-xl text-xs">
                        <strong className="text-slate-900 block mb-0.5">Author Reply:</strong>
                        <p className="text-slate-600">{rev.reply}</p>
                      </div>
                    )}

                    {session && isAuthor && !rev.reply && !isEditing && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                        <input
                          type="text"
                          placeholder="Write a reply as author..."
                          value={replyText[rev.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white"
                        />
                        <button
                          onClick={() => handleReplySubmit(rev.id)}
                          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Contact Modal */}
      {showContactModal && session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => { setShowContactModal(false); setCopied(false); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              ×
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-1">Contact {authorName}</h3>
            <p className="text-xs text-slate-500 mb-6">Choose how you would like to reach out regarding <span className="font-bold text-slate-700">{listing.title}</span>.</p>
            <div className="space-y-3">
              <button
                onClick={() => handleCopyEmail(authorEmail)}
                className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📋</span>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-slate-900">Copy Email Address</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{authorEmail}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {copied ? '✓ Copied!' : 'Copy'}
                </span>
              </button>
              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-red-50 border border-slate-200 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">✉️</span>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-slate-900 group-hover:text-red-700">Open in Gmail</div>
                    <div className="text-xs text-slate-500 mt-0.5">Composes a pre-filled email in Gmail</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-red-600">↗</span>
              </a>
              <a
                href={outlookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📨</span>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-slate-900 group-hover:text-blue-700">Open in Outlook</div>
                    <div className="text-xs text-slate-500 mt-0.5">Composes a pre-filled email in Outlook</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-blue-600">↗</span>
              </a>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => { setShowContactModal(false); setCopied(false); }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}