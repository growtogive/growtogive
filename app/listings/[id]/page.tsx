'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReviewForm from '@/components/ReviewForm';

export default function ListingDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeReviewsItem, setActiveReviewsItem] = useState<any>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Set to a test reviewer ID (e.g., matching another seeded user or session). 
  // To test the self-review block, you can temporarily match listing.authorId here.
  const currentUserId = 'user_mock_id';

  useEffect(() => {
    if (id) {
      fetchListingDetail();
    }
  }, [id]);

  const fetchListingDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/marketplace`);
      if (!res.ok) throw new Error('Failed to fetch listing');
      const data = await res.json();
      const found = Array.isArray(data) ? data.find((item: any) => item.id === id) : null;
      setListing(found || null);
    } catch (err) {
      console.error(err);
      setListing(null);
    } finally {
      setLoading(false);
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

  const realReviews = listing.reviews || [];
  const reviewCount = realReviews.length;
  const ratingVal = reviewCount > 0 
    ? (realReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewCount).toFixed(1) 
    : 'New';

  const authorSlug = listing.authorId || listing.author?.name?.toLowerCase().replace(/\s+/g, '-') || 'user';
  const authorEmail = listing.author?.email || `${(listing.author?.name || 'member').toLowerCase().replace(/\s+/g, '')}@growtogive.org`;
  const subject = encodeURIComponent(`Regarding your GrowToGive listing: ${listing.title}`);
  const body = encodeURIComponent(`Hi ${listing.author?.name || 'Neighbor'},\n\nI saw your listing "${listing.title}" on GrowToGive and am interested in connecting.\n\nBlessings!`);

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${authorEmail}&su=${subject}&body=${body}`;
  const outlookUrl = `https://outlook.live.com/owa/?path=/mail/action/compose&to=${authorEmail}&subject=${subject}&body=${body}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center gap-4">
          <Link href="/marketplace" className="flex items-center gap-2.5">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-black tracking-tight text-slate-900">GrowToGive</span>
          </Link>
          <Link
            href="/marketplace"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
          >
            ← Back to Marketplace
          </Link>
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
              <span className={`absolute top-6 left-6 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md ${
                listing.type === 'OFFER' ? 'bg-emerald-600 text-white' :
                listing.type === 'REQUEST' ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
              }`}>
                {listing.type}
              </span>
            </div>
          )}

          <div className="p-8">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 inline-block mb-3">
                  {listing.category || 'Goods'}
                </span>
                <h1 className="text-3xl font-black text-slate-900 leading-tight">
                  {listing.title}
                </h1>
              </div>

              <button
                onClick={() => setActiveReviewsItem(listing)}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-2xl transition-colors cursor-pointer group shadow-xs shrink-0"
                title="Click to view reviews"
              >
                <span className="text-amber-500 font-black text-base">★</span>
                <span className="text-sm font-black text-slate-900 group-hover:text-amber-800">{ratingVal}</span>
                <span className="text-xs text-slate-500 font-bold">({reviewCount} reviews)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 py-4 border-y border-slate-100 my-6 text-sm font-bold text-slate-600">
              <span>⛪</span>
              <span className="text-slate-800 font-bold">
                {listing.author?.churchName || listing.churchName || 'Grace Family Church'}
              </span>
              <span className="ml-4 font-normal text-slate-400">📍 {listing.distance || '1.2'} miles away</span>
            </div>

            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h2>
              <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Exchange Value</span>
                <div className="text-3xl font-black text-emerald-700">
                  {Number(listing.priceInBucks) > 0 ? `${Number(listing.priceInBucks).toFixed(2)} GrowBucks` : 'Free'}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm text-center transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>✉️</span> Contact Member
                </button>

                <Link
                  href={`/users/${authorSlug}`}
                  className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-sm text-center transition-all"
                >
                  👤 Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-4">Leave Feedback</h3>
          <ReviewForm
            listingId={listing.id}
            listingType={listing.type}
            authorId={listing.authorId}
            currentUserId={currentUserId}
            existingReviews={realReviews}
            onReviewSubmitted={() => {
              fetchListingDetail();
            }}
          />
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
            <h3 className="text-xl font-black text-slate-900 mb-1">Contact {listing.author?.name || 'Member'}</h3>
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
                <h3 className="text-xl font-black text-slate-900">Feedback for {listing.author?.name || 'Member'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Listing: {listing.title}</p>
              </div>
              <div className="ml-auto bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl font-black text-sm shrink-0">
                ★ {ratingVal} / 5.0
              </div>
            </div>

            <div className="space-y-4">
              {realReviews.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No reviews submitted for this listing yet. Be the first!</p>
              ) : (
                realReviews.map((rev: any) => (
                  <div key={rev.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-slate-900 text-sm">{rev.author?.name || rev.author || 'Community Member'}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-500 font-bold text-xs">{'★'.repeat(rev.rating)}</span>
                        <span className="text-slate-400 text-xs">{rev.date || new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{rev.comment}</p>
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