'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { data: session } = useSession();

  const [listing, setListing] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReviewsItem, setActiveReviewsItem] = useState<any>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListingDetail();
    }
  }, [id]);

  const fetchListingDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) throw new Error('Failed to fetch listing details');
      const data = await res.json();
      const listingData = data.listing || data;
      setListing(listingData);
      setReviews(listingData.reviews || []);
    } catch (err) {
      console.error(err);
      setListing(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete listing.');
      router.push('/profile');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const isAuthor = session?.user?.email && listing.author?.email === session.user.email;
  const isCommercial = listing.type === 'COMMERCIAL';
  const displayCity = (listing.city || listing.author?.city || '').trim() || 'General City';
  
  // Updated to pull purely from the author profile now that listing.churchName is removed:
  const displayChurch = (listing.author?.churchName || '').trim() || 'Grace Family Church';

  const createdDate = new Date(listing.createdAt || Date.now());
  const memberSinceDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const expDate = new Date(createdDate);
  expDate.setDate(expDate.getDate() + 14);
  const expirationDateFormatted = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const displayDistance = listing.distance !== undefined && listing.distance !== null ? listing.distance : '1.2';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center gap-4">
          <Link href="/marketplace" className="flex items-center gap-2.5">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-black tracking-tight text-slate-900">GrowToGive</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthor && (
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

      <main className="w-full max-w-4xl mx-auto px-6 pt-10 space-y-8">
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
                isCommercial 
                  ? 'bg-sky-100 text-blue-800 border-sky-300' 
                  : 'bg-slate-100 text-black border-slate-200'
              }`}>
                {listing.type}
              </span>
            </div>
          )}

          <div className="p-8 space-y-6">
            {/* 1. Title */}
            <div>
              <h1 className="text-3xl font-black text-slate-900 leading-tight">
                {listing.title}
              </h1>
            </div>

            {/* 2. City > Church, Category, Expiry/Member Since */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-slate-100 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <span className="bg-slate-100 border border-slate-200 px-3 py-1">
                  📍 {displayCity} &gt; {displayChurch}
                </span>
                <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 uppercase tracking-wider">
                  {listing.category || 'Goods'}
                </span>
              </div>
              <div className="text-slate-500 font-normal">
                {isCommercial ? (
                  <span>Member Since: {memberSinceDate}</span>
                ) : (
                  <span>Expires: {expirationDateFormatted}</span>
                )}
              </div>
            </div>

            {/* 3. Description */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h2>
              <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {/* Business Hours (Commercial Only) */}
            {isCommercial && listing.businessHours && (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">Hours</h2>
                <p className="text-slate-800 font-medium text-sm whitespace-pre-line">
                  {listing.businessHours}
                </p>
              </div>
            )}

            {!isCommercial && (
              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Amount</span>
                <div className="text-3xl font-black text-emerald-700">
                  {Number(listing.priceInBucks) > 0 ? `GB ${Number(listing.priceInBucks).toFixed(2)}` : 'Free'}
                </div>
              </div>
            )}

            {/* 4. Footer: Author, miles away, reviews badge, contact member */}
            <div className="pt-6 border-t border-slate-100 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <Link href={`/users/${authorSlug}`} className="text-emerald-600 hover:underline font-bold flex items-center gap-1.5 text-base">
                  👤 {authorName}
                </Link>
                <span className="text-xs font-normal text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-md">
                  📍 {displayDistance} miles away
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveReviewsItem(listing)}
                  className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-2xl transition-colors cursor-pointer group shadow-xs shrink-0"
                  title="Click to view reviews"
                >
                  <span className="text-amber-500 font-black text-base">★</span>
                  <span className="text-sm font-black text-slate-900 group-hover:text-amber-800">{ratingVal}</span>
                  <span className="text-xs text-slate-500 font-bold">({reviewCount})</span>
                </button>

                <button
                  onClick={() => setShowContactModal(true)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm text-center transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>✉️</span> Contact Member
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Feedback Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-4">Leave Feedback</h3>
          
          {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>}

          {isAuthor ? (
            <p className="text-xs text-slate-400 italic">You cannot submit feedback or reviews on your own listing.</p>
          ) : !session ? (
            <p className="text-xs text-slate-500">Please <Link href="/login" className="text-emerald-600 font-bold underline">log in</Link> to leave feedback.</p>
          ) : (
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
                placeholder="Share your experience (submitting again will update your previous review)..."
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
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Community Reviews ({reviews.length})</h4>
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400">No reviews yet for this listing.</p>
            ) : (
              reviews.map((rev: any) => (
                <div key={rev.id} className="p-4 border border-slate-200 bg-slate-50 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-900">{rev.author?.name || 'Member'}</span>
                    <span className="text-xs text-amber-500 font-black">{'★'.repeat(rev.rating)}</span>
                  </div>
                  <p className="text-slate-600 text-xs">{rev.comment}</p>

                  {rev.reply && (
                    <div className="mt-2 p-3 bg-white border-l-4 border-emerald-600 rounded-xl text-xs">
                      <strong className="text-slate-900 block mb-0.5">Author Reply:</strong>
                      <p className="text-slate-600">{rev.reply}</p>
                    </div>
                  )}

                  {isAuthor && !rev.reply && (
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
              ))
            )}
          </div>
        </div>
      </main>

      {/* Contact Modal */}
      {showContactModal && (
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

      {/* Reviews Modal */}
      {activeReviewsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-lg w-full shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActiveReviewsItem(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Feedback for {authorName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Listing: {listing.title}</p>
              </div>
              <div className="ml-auto bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl font-black text-sm shrink-0">
                ★ {ratingVal} / 5.0
              </div>
            </div>

            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No reviews yet.</p>
              ) : (
                reviews.map((rev: any) => (
                  <div key={rev.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-900">{rev.author?.name || 'Member'}</span>
                      <span className="text-xs text-amber-500 font-bold">{'★'.repeat(rev.rating)}</span>
                    </div>
                    <p className="text-slate-600 text-xs">{rev.comment}</p>
                    {rev.reply && (
                      <div className="mt-2 p-2 bg-white border-l-2 border-emerald-600 text-[11px] rounded-lg">
                        <strong>Author Reply:</strong> {rev.reply}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 flex gap-3">
              <Link
                href={`/users/${authorSlug}`}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl text-center transition-colors shadow-md"
              >
                View Full User Profile
              </Link>
              <button
                onClick={() => setActiveReviewsItem(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-xl transition-colors"
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