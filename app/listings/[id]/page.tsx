'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
  const [error, setError] = useState('');

  // Active Image Index for Gallery Viewer
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // In-App Message Modal States
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [messageSuccess, setMessageSuccess] = useState('');

  // Upgrade States
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState('');

  // Transfer Modal States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [submittingReview, setSubmittingReview] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListingDetail();
    }
  }, [id]);

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

  useEffect(() => {
    if (!mapLoaded || !listing) return;

    const lat = listing.latitude || listing.author?.latitude;
    const lng = listing.longitude || listing.author?.longitude;

    if (lat && lng) {
      const isCommercial = listing.type === 'COMMERCIAL' || listing.isCommercial;
      let pinLat = Number(lat);
      let pinLng = Number(lng);

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
      setActiveImageIndex(0);

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

  const handleUpgrade = async (upgradeType: 'FEATURED' | 'COMMERCIAL') => {
    if (!id) return;
    setUpgrading(true);
    setUpgradeError('');
    setUpgradeSuccess('');

    try {
      const res = await fetch(`/api/listings/${id}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upgradeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upgrade listing.');

      setUpgradeSuccess(
        upgradeType === 'FEATURED'
          ? '🎉 Successfully upgraded to Featured ($1.00)! Unlocked up to 5 images, extended expiration by 14 days, and highlighted.'
          : '🎉 Successfully upgraded to Commercial listing ($50/month processed)!'
      );
      fetchListingDetail();
    } catch (err: any) {
      setUpgradeError(err.message);
    } finally {
      setUpgrading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    setSendingMessage(true);
    setMessageError('');
    setMessageSuccess('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          receiverId: listing.authorId || listing.author?.id,
          content: messageContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');

      setMessageSuccess('Private message sent successfully! The author has been notified.');
      setMessageContent('');
    } catch (err: any) {
      setMessageError(err.message);
    } finally {
      setSendingMessage(false);
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

  const isCommercial = listing.type === 'COMMERCIAL' || listing.isCommercial;
  const isFeatured = listing.isFeatured;
  const displayCity = (listing.city || listing.author?.city || '').trim() || 'General City';
  const displayChurch = (listing.churchName || listing.author?.churchName || listing.author?.church || '').trim() || 'Grace Family Church';

  const createdDate = new Date(listing.createdAt || Date.now());
  const memberSinceDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const expDate = new Date(listing.expiresAt || createdDate);
  const expirationDateFormatted = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const displayDistance = `${listing.distance !== undefined && listing.distance !== null ? listing.distance : 0} mi`;
  const priceDisplay = !isCommercial ? `GB: ${Number(listing.priceInBucks || 0).toFixed(2)}` : null;
  const hasCoords = Boolean(listing.latitude || listing.author?.latitude);

  const storefrontAddress = listing.location || '';
  const googleMapsSearchUrl = storefrontAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storefrontAddress)}` : '#';

  // Images handling (up to 5 images)
  const listingImages = (listing.images && listing.images.length > 0) ? listing.images : (listing.imageUrl ? [listing.imageUrl] : []);
  const currentActiveImage = listingImages[activeImageIndex] || listingImages[0];

  // Commercial Metrics
  const stats = listing.stats || { views: 42, contactClicks: 7, shares: 3 };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <header className="w-full bg-white border-b-2 border-blue-500 sticky top-0 z-40 shadow-sm">
        <div className="w-full mx-auto px-4 py-3.5 flex justify-between items-center gap-4" style={{ maxWidth: '750px' }}>
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

      <main className="w-full mx-auto px-4 pt-10 space-y-8" style={{ maxWidth: '750px' }}>
        
        {/* Upgrade Callout Box: Visible ONLY if the user is the author and the listing is NOT already featured */}
        {isAuthor && !isFeatured && (
          <div className="bg-sky-50 border border-sky-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider">Listing Upgrade Options</h3>
                <p className="text-xs text-blue-700 mt-0.5">
                  {!isCommercial 
                    ? 'Upgrade your Offer/Request to Featured ($1.00) to unlock up to 5 photos, extend expiration by 14 days, sort at the top, and highlight!'
                    : 'Your Commercial listing is active ($50/mo). You get up to 5 images, video upload, top sorting, storefront stats, and exact mapping.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!isCommercial && (
                  <button
                    onClick={() => handleUpgrade('FEATURED')}
                    disabled={upgrading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {upgrading ? 'Processing...' : 'Upgrade to Featured ($1.00 / +5 Photos & 14 Days)'}
                  </button>
                )}
                {isCommercial && (
                  <button
                    onClick={() => handleUpgrade('COMMERCIAL')}
                    disabled={upgrading}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {upgrading ? 'Processing...' : 'Renew Commercial ($50 / mo)'}
                  </button>
                )}
              </div>
            </div>
            {upgradeError && <p className="text-xs text-rose-700 font-semibold">{upgradeError}</p>}
            {upgradeSuccess && <p className="text-xs text-emerald-700 font-bold">{upgradeSuccess}</p>}
          </div>
        )}

        {/* Commercial Storefront Stats Section */}
        {isCommercial && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md flex items-center justify-around text-center">
            <div>
              <div className="text-2xl font-black text-emerald-400">{stats.views}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Total Views</div>
            </div>
            <div className="border-r border-slate-800 h-10"></div>
            <div>
              <div className="text-2xl font-black text-blue-400">{stats.contactClicks}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Contact Clicks</div>
            </div>
            <div className="border-r border-slate-800 h-10"></div>
            <div>
              <div className="text-2xl font-black text-amber-400">{stats.shares}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Shares</div>
            </div>
          </div>
        )}

        {/* Main Listing Container with Highlighted Border if Featured */}
        <div className={`bg-white rounded-3xl overflow-hidden shadow-sm transition-all ${
          isFeatured ? 'border-4 border-amber-400 shadow-md ring-2 ring-amber-200' : 'border border-slate-200'
        }`}>
          
          {/* Main Image / Gallery Viewer */}
          {listingImages.length > 0 ? (
            <div className="space-y-3 p-4 bg-slate-50/50">
              <div className="h-[420px] w-full bg-slate-100 relative overflow-hidden rounded-2xl border border-slate-200">
                <img
                  src={currentActiveImage}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  onError={(e: any) => { e.target.style.display = 'none'; }}
                />
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide border shadow-sm ${
                    isCommercial ? 'bg-sky-100 text-blue-800 border-sky-300' : 'bg-white text-black border-slate-200'
                  }`}>
                    {listing.type}
                  </span>
                  {isFeatured && (
                    <span className="bg-amber-400 text-amber-950 border border-amber-500 px-3 py-1 rounded text-xs font-black uppercase tracking-wide shadow-md">
                      ★ Featured Highlight
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail Gallery for Additional Images (Up to 5) */}
              {listingImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {listingImages.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-16 bg-slate-100 border rounded-xl overflow-hidden cursor-pointer transition-all ${
                        activeImageIndex === idx ? 'border-emerald-600 ring-2 ring-emerald-300 shadow-sm' : 'border-slate-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-60 w-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-bold">
              No Image Available
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
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-900 font-bold">{priceDisplay}</span>
                      {session && !isAuthor && (
                        <button
                          onClick={() => {
                            setTransferAmount(Number(listing.priceInBucks || 0));
                            setTransferError('');
                            setTransferSuccess('');
                            setShowTransferModal(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          title="Transfer Growbucks for this offer/request"
                        >
                          <span>💸</span> Transfer GB
                        </button>
                      )}
                    </div>
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

            {/* Video Preview for Commercial Listings */}
            {isCommercial && listing.videoUrl && (
              <div className="p-5 bg-sky-50/50 border border-sky-200 rounded-2xl space-y-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-sky-800">Attached Video</h2>
                <a
                  href={listing.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline font-bold text-sm"
                >
                  <span>▶</span> Watch Commercial Video ↗
                </a>
              </div>
            )}

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
                  <Link href={`/profile/${authorSlug}`} className="text-emerald-600 hover:underline font-bold flex items-center gap-1.5 text-base">
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
                      setShowMessageModal(true);
                    }
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm text-center transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>✉</span> Send Private Message
                </button>
              </div>
            </div>
          </div>

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

        {/* In-App Private Message Modal */}
        {showMessageModal && session && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full shadow-2xl relative space-y-4">
              <button
                onClick={() => { setShowMessageModal(false); setMessageSuccess(''); setMessageContent(''); }}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                ×
              </button>

              <h3 className="text-xl font-black text-slate-900">Message {authorName}</h3>
              <p className="text-xs text-slate-500">Send a secure private message regarding <span className="font-bold text-slate-700">{listing.title}</span>.</p>

              {messageError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {messageError}
                </div>
              )}

              {messageSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl space-y-3 text-center">
                  <p className="font-bold text-sm">🎉 {messageSuccess}</p>
                  <button
                    onClick={() => { setShowMessageModal(false); setMessageSuccess(''); setMessageContent(''); }}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Your Message</label>
                    <textarea
                      rows={4}
                      required
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Write your message here..."
                      className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowMessageModal(false); setMessageContent(''); }}
                      className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingMessage}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      {sendingMessage ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Growbucks Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full shadow-2xl relative space-y-4">
              <button
                onClick={() => setShowTransferModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                ×
              </button>
              
              <h3 className="text-xl font-black text-slate-900">Growbucks Transfer</h3>
              <p className="text-xs text-slate-500">Send Growbucks securely for this offer/request.</p>

              {transferError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {transferError}
                </div>
              )}

              {transferSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl space-y-3 text-center">
                  <p className="font-bold text-sm">🎉 {transferSuccess}</p>
                  <button
                    onClick={() => { setShowTransferModal(false); window.location.reload(); }}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (transferAmount <= 0) {
                    setTransferError('Transfer amount must be greater than zero.');
                    return;
                  }
                  if (isAuthor) {
                    setTransferError('You cannot transfer Growbucks to your own listing.');
                    return;
                  }

                  setTransferring(true);
                  setTransferError('');
                  try {
                    const res = await fetch('/api/growbucks/transfer', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        listingId: listing.id,
                        receiverId: listing.authorId || listing.author?.id,
                        amount: transferAmount,
                        reason: listing.title,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Transfer failed.');
                    setTransferSuccess('Transfer completed! 90% sent to receiver, 10% platform commission logged.');
                  } catch (err: any) {
                    setTransferError(err.message);
                  } finally {
                    setTransferring(false);
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Listing Title (Reason)</label>
                    <input
                      type="text"
                      disabled
                      value={listing.title}
                      className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs rounded-xl font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Recipient</label>
                    <input
                      type="text"
                      disabled
                      value={authorName}
                      className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs rounded-xl font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Transfer Amount (GB)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl font-bold focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">90% goes to recipient, 10% platform commission applies. Minimum &gt; 0.</p>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTransferModal(false)}
                      className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={transferring}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      {transferring ? 'Processing...' : 'Confirm Transfer'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otherListings.map((item: any) => {
                const itemIsCommercial = item.type === 'COMMERCIAL' || item.isCommercial;
                const itemPrice = !itemIsCommercial ? `GB: ${Number(item.priceInBucks || 0).toFixed(2)}` : 'Commercial';
                const itemImg = (item.images && item.images.length > 0) ? item.images[0] : item.imageUrl;
                return (
                  <Link
                    key={item.id}
                    href={`/listings/${item.id}`}
                    className="group border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col"
                  >
                    {itemImg ? (
                      <div className="h-40 w-full bg-slate-100 relative overflow-hidden">
                        <img
                          src={itemImg}
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
    </div>
  );
}