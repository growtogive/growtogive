// app/profile/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import FavoriteButton from '@/components/FavoriteButton';

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const loggedInEmail = (session?.user as any)?.email;
  const loggedInId = (session?.user as any)?.id;
  const basicTrainingPassed = (session?.user as any)?.basicTrainingPassed;
  const isAdmin = loggedInEmail === 'admin@growtogive.com';

  const [userProfile, setUserProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  // Transfer Modal States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  // Admin delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listingAction, setListingAction] = useState<'unpublish' | 'delete'>('unpublish');
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnProfile = Boolean(
    (loggedInEmail && userProfile?.email && loggedInEmail.toLowerCase().trim() === userProfile.email.toLowerCase().trim()) ||
    (loggedInId && userProfile?.id && loggedInId === userProfile.id)
  );

  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  }, [id, loggedInEmail]);

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
        return;
      }

      const userListings = data.listings || [];

      const directReviews = foundUser.reviews || [];
      const commercialReviews = userListings
        .filter((item: any) => (item.type || '').toUpperCase() === 'COMMERCIAL')
        .flatMap((item: any) => item.reviews || []);

      const combinedReviews = [...directReviews, ...commercialReviews];

      setUserProfile({
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name || 'Community Member',
        churchName: foundUser.churchName || 'Grace Family Church',
        city: foundUser.city || 'Bradenton',
        state: foundUser.state || 'FL',
        image: foundUser.avatar || null,
        createdAt: foundUser.createdAt,
        reviews: combinedReviews,
        isFavorited: foundUser.isFavorited || false,
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
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{userProfile.name}</h1>
                {!isOwnProfile && <FavoriteButton userId={profileUserId} initialIsFavorited={userProfile.isFavorited} />}
              </div>
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

              {/* Transfer Growbucks Button for other users */}
              {!isOwnProfile && session && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (!basicTrainingPassed) {
                        setTransferError('You must complete Basic Training before trading or sending Growbucks.');
                      } else {
                        setTransferError('');
                      }
                      setTransferAmount('');
                      setTransferReason('');
                      setTransferSuccess('');
                      setShowTransferModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1 inline-flex"
                  >
                    <span>💸</span> Transfer Growbucks
                  </button>
                </div>
              )}
              
              {isAdmin && !isOwnProfile && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {listings.map((listing: any) => {
              const isCommercial = (listing.type || '').toUpperCase() === 'COMMERCIAL';
              const priceDisplay = !isCommercial ? `GB ${Number(listing.priceInBucks || 0).toFixed(2)}` : 'Storefront';
              const createdDate = new Date(listing.createdAt || Date.now());
              const expirationDate = new Date(createdDate);
              expirationDate.setDate(expirationDate.getDate() + 14);

              return (
                <div key={listing.id} className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 transition-all">
                  <Link href={`/listings/${listing.id}`} className="block">
                    <div className="relative h-52 bg-slate-100 overflow-hidden">
                      <img
                        src={listing.imageUrl || listing.image || 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'}
                        alt={listing.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                      <span className={`absolute top-3 left-3 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                        isCommercial ? 'bg-sky-100 text-blue-800 border-sky-300' : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {listing.type}
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{listing.title}</h3>
                      <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">{listing.description}</p>
                    </div>
                  </Link>

                  <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{priceDisplay}</span>
                    <span className="font-normal text-[11px] text-slate-500">Expires: {expirationDate.toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer Growbucks Modal */}
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
            <p className="text-xs text-slate-500">Send Growbucks securely to <span className="font-bold text-slate-700">{userProfile.name}</span>.</p>

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
                
                if (!basicTrainingPassed) {
                  setTransferError('You must complete Basic Training before trading or sending Growbucks.');
                  return;
                }

                const numericAmount = parseFloat(transferAmount);
                if (isNaN(numericAmount) || numericAmount <= 0) {
                  setTransferError('Transfer amount must be greater than zero.');
                  return;
                }

                if (!transferReason || !transferReason.trim()) {
                  setTransferError('A memo or reason is required for this transfer.');
                  return;
                }

                setTransferring(true);
                setTransferError('');
                try {
                  const res = await fetch('/api/growbucks/transfer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      receiverId: profileUserId,
                      amount: numericAmount,
                      reason: transferReason.trim(),
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Recipient</label>
                  <input
                    type="text"
                    disabled
                    value={userProfile.name}
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
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl font-bold focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Memo / Reason (Required)</label>
                  <input
                    type="text"
                    required
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="e.g. Thanks for the help!"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl font-bold focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">90% goes to recipient, 10% platform commission applies.</p>
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

      {/* Reviews Modal */}
      {showReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Member Reviews ({reviewsList.length})</h3>
              <button 
                onClick={() => setShowReviewsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer px-2 py-1"
              >
                ✕
              </button>
            </div>

            {reviewsList.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs font-medium">No reviews yet for this member.</p>
            ) : (
              <div className="space-y-4 divide-y divide-slate-100">
                {reviewsList.map((rev: any, idx: number) => (
                  <div key={rev.id || idx} className="pt-4 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        {rev.author?.name || rev.reviewerName || 'Community Member'}
                      </span>
                      <span className="text-amber-500 font-bold text-xs">
                        {'★'.repeat(rev.rating || 5)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment || rev.text}</p>
                    <span className="text-[10px] text-slate-400 block">
                      {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-right border-t border-slate-100">
              <button
                onClick={() => setShowReviewsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete User Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Delete User Account</h3>
            <p className="text-xs text-slate-600">
              What would you like to do with active listings created by <span className="font-bold">{userProfile.name}</span>?
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="listingAction"
                  value="unpublish"
                  checked={listingAction === 'unpublish'}
                  onChange={() => setListingAction('unpublish')}
                />
                Unpublish listings (keep records)
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="listingAction"
                  value="delete"
                  checked={listingAction === 'delete'}
                  onChange={() => setListingAction('delete')}
                />
                Permanently delete listings
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(profileUserId)}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}