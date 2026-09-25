'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role;
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b mb-6 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        
        {/* Logo (Links to Home) */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl group-hover:scale-110 transition-transform">🌱</span>
          <span className="text-xl font-bold text-green-600 tracking-tight">GrowToGive</span>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {status === 'loading' ? (
            <span className="text-gray-400 text-sm">Loading...</span>
          ) : session ? (
            <>
              {/* Marketplace Link */}
              <Link
                href="/marketplace"
                className={`group relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  pathname === '/marketplace' ? 'bg-slate-200 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-600'
                }`}
              >
                <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold">
                  Marketplace
                </span>
              </Link>

              {/* My Profile Link */}
              <Link
                href="/profile"
                className={`group relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  pathname === '/profile' ? 'bg-slate-200 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-600'
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
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    pathname === '/admin/dashboard' ? 'bg-slate-200 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-blue-600'
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

              {/* Sign Out Button */}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="group relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-rose-600 transition-all cursor-pointer"
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
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors shadow-xs"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}