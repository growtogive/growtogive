// app/users/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import FavoriteButton from '@/components/FavoriteButton';

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const loggedInEmail = (session?.user as any)?.email;
  const loggedInUserId = (session?.user as any)?.id;
  const isAdmin = loggedInEmail === 'admin@growtogive.com';
  const isOwnProfile = loggedInUserId === id;

  const [userProfile, setUserProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [userFavoriteIds, setUserFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  // Admin delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listingAction, setListingAction] = useState<'unpublish' | 'delete'>('unpublish');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  }, [id, loggedInUserId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/profile?userId=${id}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();

      const foundUser = data.user;
      if (!foundUser) {
        setUserProfile(null);
        setListings([]);
        setFavorites([]);
        return;
      }

      const userListings = data.listings || [];
      const userFavorites = data.favorites || [];
      setUserFavoriteIds(userFavorites.map((f: any) => f.listingId || f.listing?.id));
      setFavorites(userFavorites);

      // Combine author direct reviews + commercial listing reviews
      const directReviews = foundUser.reviews || [];
      const commercialReviews = userListings
        .filter((item: any) => (item.type || '').toUpperCase() === 'COMMERCIAL')
        .flatMap((item: any) => item.reviews || []);

      const combinedReviews = [...directReviews, ...commercialReviews];

      setUserProfile({
        id: foundUser.id,
        name: foundUser.name || 'Community Member',
        churchName: foundUser.churchName || 'Grace Family Church',
        city: foundUser.city || 'Bradenton',
        state: foundUser.state || 'FL',
        image: foundUser.avatar || null,
        createdAt: foundUser.createdAt,
        reviews: combinedReviews,
      });
      setListings(userListings);
    } catch (err) {
      console.error(err);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/profile?userId=${targetUserId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingAction }),
      });

      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      }

      if (!res.ok) throw new Error(data.error || data.message || 'Failed to delete user');

      alert(data.message || 'User deleted successfully');
      window.location.href = '/marketplace';
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
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

  const profileUserId = userProfile.id;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Profile
            </h1>
            <h2 className="text-sm sm:text-base font-medium text-slate-500">
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

        {/* User Card */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 mb-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-xl bg-emerald-100 text-emerald-800 font-black text-2xl flex items-center justify-center border border-emerald-200 shrink-0 shadow-inner overflow-hidden">
              {userProfile.image ? (
                <img src={userProfile.image} alt={userProfile.name} className="w-full h-full object-cover" />
              ) : (
                userProfile.name ? userProfile.name.charAt(0) : 'U'
              )}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{userProfile.name}</h1>
              <p className="text-xs text-slate-500">Member since {memberSinceFormatted}</p>
              
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <span className="bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 rounded-md">
                  📍 {userProfile.city}, {userProfile.state}
                </span>
                {userProfile.churchName && (
                  <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 rounded-md">
                    ⛪ {userProfile.churchName}
                  </span>
                )}
              </div>
              
              {isAdmin && loggedInUserId !== profileUserId && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Delete User (Admin)
                  </button>
                </div>
              )}
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

        {/* Saved Favorites Section (Visible if viewing own profile) */}
        {isOwnProfile && (
          <div className="mb-12">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">Saved Favorites ({favorites.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Listings you have bookmarked. Expired items (older than 14 days) are automatically cleaned up.</p>
            </div>

            {favorites.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs font-medium">
                You haven&apos;t favorited any listings yet. Click the heart icon on any listing card to save it here!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {favorites.map(({ listing }) => {
                  if (!listing) return null;
                  const createdDate = new Date(listing.createdAt || Date.now());
                  const expirationDate = new Date(createdDate);
                  expirationDate.setDate(expirationDate.getDate() + 14);
                  const isCommercial = (listing.type || '').toUpperCase() === 'COMMERCIAL';
                  const priceDisplay = !isCommercial ? `GB ${Number(listing.priceInBucks || 0).toFixed(2)}` : 'Storefront';

                  return (
                    <div key={listing.id} className="border border-slate-200 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all rounded-xl overflow-hidden group relative">
                      <div className="absolute top-3 right-3 z-10">
                        <FavoriteButton listingId={listing.id} initialIsFavorited={true} />
                      </div>

                      <Link href={`/listings/${listing.id}`} className="block">
                        <div className="h-52 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                          <img
                            src={listing.imageUrl || listing.image || 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <span className={`absolute top-3 left-3 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                            isCommercial ? 'bg-sky-100 text-blue-800 border-sky-300' : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            {listing.type}
                          </span>
                        </div>

                        <div className="p-5 space-y-3">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors leading-snug">
                            {listing.title}
                          </h3>
                          <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                            {listing.description}
                          </p>
                        </div>
                      </Link>

                      <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>{priceDisplay}</span>
                        <span className="font-normal text-[11px] text-slate-500">
                          Expires: {expirationDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* User's Posted Listings */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Listings by {userProfile.name} ({listings.length})</h2>
          <p className="text-xs text-slate-500 mt-0.5">Explore offers, requests, and store items posted by this member.</p>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 text-sm font-medium">
            This user has no active listings at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map((item: any) => {
              const createdDate = new Date(item.createdAt || Date.now());
              const expirationDate = new Date(createdDate);
              expirationDate.setDate(expirationDate.getDate() + 14);
              const isCommercial = (item.type || '').toUpperCase() === 'COMMERCIAL';
              
              const displayCity = (item.city || userProfile.city || '').trim() || 'General City';
              const displayChurch = (item.churchName || userProfile.churchName || '').trim() || 'Grace Family Church';
              const dateDisplay = isCommercial ? `Created: ${createdDate.toLocaleDateString()}` : `Expires: ${expirationDate.toLocaleDateString()}`;
              const priceDisplay = !isCommercial ? `GB ${Number(item.priceInBucks || 0).toFixed(2)}` : 'Storefront';
              const isFavorited = userFavoriteIds.includes(item.id);

              return (
                <div key={item.id} className="border border-slate-200 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all rounded-xl overflow-hidden group relative">
                  <div className="absolute top-3 right-3 z-10">
                    <FavoriteButton listingId={item.id} initialIsFavorited={isFavorited} />
                  </div>

                  <Link href={`/listings/${item.id}`} className="block">
                    <div className="h-52 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={item.imageUrl || item.image || 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e: any) => { 
                          e.target.src = 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'; 
                        }}
                      />
                      <span className={`absolute top-3 left-3 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
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
                          <span className="text-blue-600 inline-block filter hue-rotate-15">✝</span>
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

      {/* Warning Modal Popup */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full shadow-2xl relative space-y-4">
            <h3 className="text-xl font-black text-slate-900">Confirm User Deletion</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action will wipe all connected records, transfer any remaining GrowBucks balance back to <span className="font-semibold text-slate-900">admin@growtogive.com</span>, and remove the user.
            </p>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700 block">Listing Action:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="listingAction"
                    value="unpublish"
                    checked={listingAction === 'unpublish'}
                    onChange={() => setListingAction('unpublish')}
                  />
                  Unpublish Listings
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="listingAction"
                    value="delete"
                    checked={listingAction === 'delete'}
                    onChange={() => setListingAction('delete')}
                  />
                  Delete Entirely
                </label>
              </div>
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteUser(profileUserId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Processing...' : 'Confirm & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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