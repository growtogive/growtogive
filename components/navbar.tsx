// components/navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Navbar() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  const emailVerified = (session?.user as any)?.emailVerified;
  const basicTrainingPassed = (session?.user as any)?.basicTrainingPassed;

  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // Modal state for restricted access attempts on Share Link
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);

  // --- HIDE NAVBAR ON CHRISTMAS APPLY PAGE ---
  if (pathname?.startsWith('/christmas/apply')) {
    return null;
  }

  useEffect(() => {
    if (session) {
      fetch('/api/messages')
        .then((res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (data && data.unreadCount !== undefined) {
            setUnreadCount(data.unreadCount);
          }
        })
        .catch((err) => {
          console.debug('Unread messages count check skipped:', err);
        });
    }
  }, [session, pathname]);

  const handleShare = async () => {
    if (!userId) return;

    // --- GATE CHECKS ---
    if (!emailVerified || !basicTrainingPassed) {
      setShowRestrictionModal(true);
      return;
    }

    const currentUrl = window.location.origin + window.location.pathname;
    const referralUrl = `${currentUrl}?ref=${userId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GrowToGive',
          text: 'Join me on GrowToGive!',
          url: referralUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if native share fails or is cancelled
      }
    }

    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <nav className="w-full bg-white shadow-xs border-b border-blue-500 mb-3 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 py-2 flex flex-wrap justify-between items-center gap-4">
        
        {/* Logo with corrected root path */}
        <Link href="/" className="flex items-center group shrink-0">
          <div className="w-[70px] h-[70px] relative overflow-hidden flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="GrowToGive Logo"
              width={70}
              height={70}
              className="object-cover group-hover:scale-105 transition-transform"
              priority
              unoptimized
            />
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          
          {status === 'loading' ? (
            <span className="text-gray-400 text-sm">Loading...</span>
          ) : session ? (
            <>
              {/* Share Referral Link Button (Icon Only) */}
              {userId && (
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center p-2.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200 cursor-pointer"
                  title="Copy your referral link"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  )}
                </button>
              )}

              {/* NEW + Button */}
              <Link
                href="/listings/new"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-md text-xs transition-all shadow-xs whitespace-nowrap"
              >
                + NEW
              </Link>

              {/* Marketplace Link */}
              <Link
                href="/marketplace"
                className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  pathname?.startsWith('/marketplace') ? 'bg-slate-200 text-blue-700 font-semibold border-b-2 border-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-600 hover:border-b-2 hover:border-slate-900'
                }`}
              >
                <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold">
                  Marketplace
                </span>
              </Link>

              {/* Members Link */}
              <Link
                href="/members"
                className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  pathname?.startsWith('/members') ? 'bg-slate-200 text-blue-700 font-semibold border-b-2 border-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-600 hover:border-b-2 hover:border-slate-900'
                }`}
              >
                <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold">
                  Members
                </span>
              </Link>

              {/* Messages Link with Notification Badge */}
              <Link
                href="/messages"
                className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  pathname?.startsWith('/messages') ? 'bg-slate-200 text-blue-700 font-semibold border-b-2 border-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-600 hover:border-b-2 hover:border-slate-900'
                }`}
              >
                <div className="relative">
                  <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold">
                  Messages {unreadCount > 0 && `(${unreadCount})`}
                </span>
              </Link>

              {/* Profile Link */}
              <Link
                href="/profile"
                className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  pathname?.startsWith('/profile') ? 'bg-slate-200 text-blue-700 font-semibold border-b-2 border-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-600 hover:border-b-2 hover:border-slate-900'
                }`}
              >
                <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold">
                  Profile
                </span>
              </Link>
              
              {/* Admin Dashboard */}
              {userRole === 'admin' && (
                <Link
                  href="/admin/dashboard"
                  className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                    pathname?.startsWith('/admin') ? 'bg-slate-200 text-blue-700 font-semibold border-b-2 border-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-600 hover:border-b-2 hover:border-slate-900'
                  }`}
                >
                  <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold">
                    Admin
                  </span>
                </Link>
              )}

              {/* Sign Out */}
              <button
                onClick={() =>
                  signOut({
                    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://growtogive.com'}/login`,
                  })
                }
                className="group relative flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-rose-600 hover:border-b-2 hover:border-slate-900 transition-all cursor-pointer"
                title="Sign Out"
              >
                <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold">
                  Logout
                </span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:border-b-2 hover:border-slate-900 rounded-md transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors shadow-xs"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Restriction Modal Popup */}
      {showRestrictionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowRestrictionModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              ×
            </button>

            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-xl font-bold">🔒</div>
            <h3 className="text-xl font-black text-slate-900">Basic Training Required</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You must pass Basic Training Quiz before sharing.
            </p>

            <div className="pt-2">
              <Link
                href="/basic-training"
                onClick={() => setShowRestrictionModal(false)}
                className="w-full inline-block text-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs"
              >
                Complete Basic Training Now
              </Link>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRestrictionModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}