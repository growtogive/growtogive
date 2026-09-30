'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  }, [id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/listings');
      if (!res.ok) throw new Error('Failed to fetch marketplace listings');
      const data = await res.json();
      const listings = Array.isArray(data) ? data : (data.listings || []);

      // Filter listings belonging to this specific user/author
      const userListings = listings.filter((item: any) => {
        const authorId = item.authorId || item.author?.id || (item.author?.name || item.authorName || '').toLowerCase().replace(/\s+/g, '-');
        return String(authorId) === String(id) || String(item.author?.id) === String(id);
      });

      let foundAuthor = userListings.length > 0 ? (userListings[0].author || { name: userListings[0].authorName }) : null;

      if (!foundAuthor) {
        // Fallback search by slug/name match
        const matchedItem = listings.find((item: any) => {
          const authorName = item.authorName || item.author?.name || '';
          return authorName.toLowerCase().replace(/\s+/g, '-') === id;
        });
        if (matchedItem) {
          foundAuthor = matchedItem.author || { name: matchedItem.authorName };
        }
      }

      if (foundAuthor) {
        setUserProfile({
          ...foundAuthor,
          listings: userListings,
          reviews: foundAuthor.reviews || userListings.flatMap((l: any) => l.reviews || [])
        });
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error(err);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium text-sm">Loading profile...</div>;
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black text-slate-900 mb-2">User Not Found</h2>
        <p className="text-slate-600 mb-6 text-sm">The user profile you are looking for does not exist.</p>
        <Link href="/marketplace" className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md hover:bg-emerald-700 transition-colors">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const reviewsList = userProfile.reviews || [];
  const avgRating = reviewsList.length > 0 
    ? (reviewsList.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewsList.length).toFixed(1)
    : 'New';

  const memberSinceFormatted = userProfile.createdAt 
    ? new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'March 2026';

  const listingsList = userProfile.listings || [];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Marketplace Title Row Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-500">
              User Profile
            </h1>
            <h2 className="text-sm sm:text-base font-medium text-gray-500">
              Member details and active listings portfolio
            </h2>
          </div>

          <Link
            href="/marketplace"
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all shadow-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          >
            <svg className="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Marketplace</span>
          </Link>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 mb-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-xl bg-emerald-100 text-emerald-800 font-black text-2xl flex items-center justify-center border border-emerald-200 shrink-0 shadow-inner">
              {userProfile.name ? userProfile.name.charAt(0) : 'U'}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 inline-block mb-2">
                ⛪ {userProfile.churchName || userProfile.church || 'Grace Family Church'}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{userProfile.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">Member since {memberSinceFormatted} • {userProfile.city || 'Bradenton'}, {userProfile.state || 'FL'}</p>
            </div>
          </div>

          <button
            onClick={() => setShowReviewsModal(true)}
            className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer group shadow-xs shrink-0"
            title="Click to view reviews"
          >
            <span className="text-amber-500 font-black text-lg group-hover:scale-110 transition-transform">★</span>
            <div className="text-left">
              <div className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                {avgRating} <span className="text-[11px] font-semibold text-emerald-700 underline">({reviewsList.length} reviews)</span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">View Feedback</div>
            </div>
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">Listings by {userProfile.name} ({listingsList.length})</h2>
          <p className="text-xs text-slate-500 mt-0.5">Explore offers, requests, and store items posted by this member.</p>
        </div>

        {listingsList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 text-sm font-medium">
            This user has no active listings at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listingsList.map((item: any) => {
              const createdDate = new Date(item.createdAt || Date.now());
              const expirationDate = new Date(createdDate);
              expirationDate.setDate(expirationDate.getDate() + 14);
              const isCommercial = (item.type || '').toUpperCase() === 'COMMERCIAL';
              
              const displayCity = (item.city || userProfile.city || '').trim() || 'General City';
              const displayChurch = (item.churchName || userProfile.churchName || '').trim() || 'Grace Family Church';
              const dateDisplay = isCommercial ? `Created: ${createdDate.toLocaleDateString()}` : `Expires: ${expirationDate.toLocaleDateString()}`;
              const priceDisplay = !isCommercial ? `GB ${Number(item.priceInBucks || 0).toFixed(2)}` : 'Storefront';

              return (
                <div key={item.id} className="border border-slate-200 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all rounded-xl overflow-hidden group">
                  <Link href={`/listings/${item.id}`} className="block">
                    <div className="h-52 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={item.imageUrl || 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e: any) => { 
                          e.target.src = 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'; 
                        }}
                      />
                      <span className={`absolute top-3 right-3 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                        isCommercial ? 'bg-sky-100 text-blue-800 border-sky-300' : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {item.type}
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors leading-snug">
                          {item.title}
                        </h3>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium mt-1 pb-2.5 border-b border-slate-100">
                          <span className="text-blue-600 inline-block filter hue-rotate-15">✝️</span>
                          <span>{displayCity} &gt; {displayChurch}</span>
                        </div>
                      </div>

                      <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </Link>

                  <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{priceDisplay}</span>
                    <span className="font-normal text-[11px] text-slate-500">
                      {dateDisplay}
                    </span>
                  </div>

                  <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>👤</span>
                      <span>{userProfile.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-medium">
                      <span className="text-slate-500">📍 {item.distance ?? 0} mi</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-lg w-full shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowReviewsModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{userProfile.name}&apos;s Reviews</h3>
                <p className="text-xs text-slate-500 mt-0.5">Community feedback tied to this user profile</p>
              </div>
              <div className="ml-auto bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-1.5 rounded-xl font-black text-sm shrink-0">
                ★ {avgRating}
              </div>
            </div>

            <div className="space-y-4">
              {reviewsList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No reviews submitted for this user yet.</p>
              ) : (
                reviewsList.map((rev: any) => (
                  <div key={rev.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-900 text-sm">{rev.author?.name || rev.author || 'Member'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500 font-bold text-xs">{'★'.repeat(rev.rating)}</span>
                        <span className="text-slate-400 text-xs">
                          {new Date(rev.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 text-center">
              <button
                onClick={() => setShowReviewsModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Reviews
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}