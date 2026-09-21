'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketplace');
      if (!res.ok) throw new Error('Failed to fetch marketplace data');
      const data = await res.json();
      
      const allListings = Array.isArray(data) ? data : [];
      const userListings = allListings.filter(
        (item: any) => String(item.authorId) === String(id) || String(item.authorName).toLowerCase().replace(/\s+/g, '-') === String(id).toLowerCase()
      );

      const firstItem = userListings[0];
      const authorName = firstItem ? firstItem.authorName : id.replace(/-/g, ' ');
      const churchName = firstItem ? firstItem.churchName : 'Grace Family Church - Tampa';
      
      // Collect all real reviews from all listings belonging to this user
      const collectedReviews: any[] = [];
      userListings.forEach((item: any) => {
        if (item.reviews && Array.isArray(item.reviews)) {
          item.reviews.forEach((r: any) => {
            // Avoid duplicate entries if multiple listings share reviews
            if (!collectedReviews.some((existing) => existing.id === r.id)) {
              collectedReviews.push({
                id: r.id,
                author: r.author?.name || r.author || 'Community Member',
                rating: r.rating,
                date: r.date || new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                comment: r.comment,
              });
            }
          });
        }
      });

      const avgRating = collectedReviews.length > 0 
        ? (collectedReviews.reduce((acc, r) => acc + r.rating, 0) / collectedReviews.length).toFixed(1)
        : 'New';

      setUserProfile({
        name: authorName,
        churchName,
        email: `${authorName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        rating: avgRating,
        memberSince: 'March 2026',
        listings: userListings,
        reviews: collectedReviews,
      });
    } catch (err) {
      console.error(err);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium text-lg">Loading profile...</div>;
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black text-slate-900 mb-2">User Not Found</h2>
        <p className="text-slate-600 mb-6">The user profile you are looking for does not exist.</p>
        <Link href="/marketplace" className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700 transition-colors">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 relative">
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/marketplace" className="text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-2">
            ← Back to Marketplace
          </Link>
          <h1 className="text-lg font-black tracking-tight text-slate-900">GrowToGive</h1>
        </div>
      </header>

      <main className="w-full max-w-4xl mx-auto px-6 pt-10">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-12 mb-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-2xl flex items-center justify-center border border-emerald-200 shrink-0 shadow-inner">
              {userProfile.name.charAt(0)}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 inline-block mb-2">
                ⛪ {userProfile.churchName}
              </span>
              <h1 className="text-3xl font-black text-slate-900 leading-tight">{userProfile.name}</h1>
              <p className="text-xs text-slate-500 mt-1">Member since {userProfile.memberSince}</p>
            </div>
          </div>

          <button
            onClick={() => setShowReviewsModal(true)}
            className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-5 py-3 rounded-2xl transition-all cursor-pointer group shadow-sm"
            title="Click to view reviews"
          >
            <span className="text-amber-500 font-black text-xl group-hover:scale-110 transition-transform">★</span>
            <div className="text-left">
              <div className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                {userProfile.rating} <span className="text-xs font-bold text-emerald-700 underline">({userProfile.reviews.length} reviews)</span>
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">View User Feedback</div>
            </div>
          </button>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-6">Listings by {userProfile.name} ({userProfile.listings.length})</h2>

        {userProfile.listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-600 font-medium">This user has no active listings at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userProfile.listings.map((item: any) => (
              <Link
                key={item.id}
                href={`/listings/${item.id}`}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-slate-400 hover:shadow-xl transition-all shadow-sm group cursor-pointer"
              >
                <div>
                  {item.imageUrl && (
                    <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className={`absolute top-4 left-4 px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-md ${
                        item.type === 'OFFER' ? 'bg-emerald-600 text-white' :
                        item.type === 'REQUEST' ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 leading-tight mb-2 transition-colors">{item.title}</h3>
                    <p className="text-slate-600 text-sm line-clamp-2 mb-4">{item.description}</p>
                    <div className="text-xl font-black text-emerald-700">
                      {Number(item.priceInBucks) > 0 ? `${Number(item.priceInBucks).toFixed(2)} GrowBucks` : 'Free'}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-600">
                  <span>⛪ {item.churchName}</span>
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">{item.distance} mi away</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Reviews Modal */}
      {showReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-lg w-full shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowReviewsModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{userProfile.name}'s Reviews</h3>
                <p className="text-xs text-slate-500 mt-0.5">Community feedback tied to this user profile</p>
              </div>
              <div className="ml-auto bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-1.5 rounded-xl font-black text-sm shrink-0">
                ★ {userProfile.rating}
              </div>
            </div>

            <div className="space-y-4">
              {userProfile.reviews.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No reviews submitted for this user yet.</p>
              ) : (
                userProfile.reviews.map((rev: any) => (
                  <div key={rev.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-900 text-sm">{rev.author}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500 font-bold text-xs">{'★'.repeat(rev.rating)}</span>
                        <span className="text-slate-400 text-xs">{rev.date}</span>
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
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-xl transition-colors"
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