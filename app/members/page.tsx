// app/members/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Haversine formula to calculate distance in miles between two coordinate pairs
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Fallback coordinate mapping for common cities so radius works instantly without explicit DB coordinates
const FALLBACK_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'bayshore gardens': { lat: 27.4984, lng: -82.5647 },
  'bradenton': { lat: 27.4982, lng: -82.5748 },
  'sarasota': { lat: 27.3364, lng: -82.5307 },
  'tampa': { lat: 27.9506, lng: -82.4572 },
  'st. petersburg': { lat: 27.7676, lng: -82.6403 },
  'orlando': { lat: 28.5383, lng: -83.3792 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'jacksonville': { lat: 30.3322, lng: -81.6557 },
};

function getCoordsForUser(user: any): { lat: number; lng: number } | null {
  // 1. If explicit lat/lng exist on user object
  if (user.latitude != null && user.longitude != null) {
    const lat = Number(user.latitude);
    const lng = Number(user.longitude);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // 2. Fallback to city matching
  if (user.city) {
    const cleanCity = user.city.toLowerCase().trim();
    if (FALLBACK_CITY_COORDS[cleanCity]) {
      return FALLBACK_CITY_COORDS[cleanCity];
    }
  }

  return null;
}

const getMemberHierarchy = (user: any) => {
  const city = (user.city || '').trim();
  const church = (user.churchName || user.church || '').trim();
  
  const displayCity = city || 'General City';
  const displayChurch = church || 'General Church';
  
  return {
    city: displayCity,
    church: displayChurch,
    hierarchyString: `${displayCity} > ${displayChurch}`
  };
};

export default function MembersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  // SWR caches members data in memory for instant navigation
  const { data: dataJson, error: swrError, isLoading } = useSWR(
    '/api/users',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  
  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHierarchy, setSelectedHierarchy] = useState('ALL');
  const [maxRadius, setMaxRadius] = useState('25');
  const [sortBy, setSortBy] = useState('date_desc');

  const users = Array.isArray(dataJson) ? dataJson : (dataJson?.users || []);

  // Find logged-in user session match
  const currentUserEmail = session?.user?.email?.toLowerCase()?.trim();
  const currentDbUser = currentUserEmail 
    ? users.find((u: any) => u.email?.toLowerCase()?.trim() === currentUserEmail)
    : null;

  // Determine center reference coordinates (Logged-in user -> Fallback city -> Default region center)
  const userCoords = currentDbUser ? getCoordsForUser(currentDbUser) : null;
  const referenceCoords = userCoords || (users.length > 0 ? getCoordsForUser(users[0]) : null) || { lat: 27.4984, lng: -82.5647 };

  const members = useMemo(() => {
    return users.map((user: any) => {
      let computedDistance = 0;
      const targetCoords = getCoordsForUser(user);

      if (referenceCoords && targetCoords) {
        computedDistance = calculateDistance(
          referenceCoords.lat,
          referenceCoords.lng,
          targetCoords.lat,
          targetCoords.lng
        );
      }

      return {
        ...user,
        name: user.name || 'Community Member',
        city: user.city || '',
        churchName: user.churchName || user.church || '',
        createdAt: user.createdAt || Date.now(),
        distance: computedDistance,
        reviews: user.reviews || [],
        image: (user.images && user.images.length > 0) ? user.images[0] : (user.avatar || user.image || user.avatarUrl || ''),
        bio: user.bio || 'Community participant and member.',
      };
    });
  }, [users, referenceCoords]);

  // Dynamically build unique City > Church options sorted alphabetically
  const uniqueHierarchies = useMemo(() => {
    return Array.from(
      new Set(
        members.map((user: any) => {
          const { city, church, hierarchyString } = getMemberHierarchy(user);
          return (user.city || user.churchName || user.church) ? hierarchyString : null;
        }).filter(Boolean)
      )
    ).sort((a: any, b: any) => a.localeCompare(b));
  }, [members]);

  // Filter and Sort Logic
  const filteredAndSortedMembers = useMemo(() => {
    let result = members.filter((user: any) => {
      const displayName = user.name || '';
      const displayCity = user.city || '';
      const displayChurch = user.churchName || '';

      const matchesSearch = 
        displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayChurch.toLowerCase().includes(searchTerm.toLowerCase());

      const { city: itemCity, hierarchyString: userHierarchy } = getMemberHierarchy(user);
      const matchesHierarchy = selectedHierarchy === 'ALL' || userHierarchy === selectedHierarchy || itemCity === selectedHierarchy;

      const distanceVal = user.distance !== undefined && user.distance !== null ? Number(user.distance) : 0;
      const matchesDistance = maxRadius === 'ALL' || distanceVal <= Number(maxRadius);

      return matchesSearch && matchesHierarchy && matchesDistance;
    });

    // Sorting logic
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'date_asc':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'distance':
          return (a.distance ?? 999) - (b.distance ?? 999);
        case 'rating': {
          const ratingA = a.reviews?.length ? a.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / a.reviews.length : 0;
          const ratingB = b.reviews?.length ? b.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / b.reviews.length : 0;
          return ratingB - ratingA;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [members, searchTerm, selectedHierarchy, maxRadius, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium text-lg">
        Loading members...
      </div>
    );
  }

  const error = swrError ? (swrError.message || 'Failed to load members.') : '';

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <main className="w-full pt-1 space-y-4 px-2.5 sm:px-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-500">
              Members
            </h1>
            <h2 className="text-sm sm:text-base font-medium text-gray-500">
              Connect with fellow church members and community participants
            </h2>
          </div>
        </div>

        {/* Control Bar */}
        <div className="bg-white px-3 pt-3.75 pb-3.75 border-b-2 border-gray-400 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-84 max-w-full shrink-0 font-medium"
            />

            <select
              value={selectedHierarchy}
              onChange={(e) => setSelectedHierarchy(e.target.value)}
              className="px-2.5 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg font-medium cursor-pointer"
            >
              <option value="ALL">All Cities & Churches</option>
              {uniqueHierarchies.map((hier: any) => (
                <option key={hier} value={hier}>{hier}</option>
              ))}
            </select>

            <select
              value={maxRadius}
              onChange={(e) => setMaxRadius(e.target.value)}
              className="px-2.5 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg font-medium cursor-pointer"
            >
              <option value="5">5 mi</option>
              <option value="10">10 mi</option>
              <option value="25">25 mi</option>
              <option value="50">50 mi</option>
              <option value="100">100 mi</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg font-medium cursor-pointer w-32 truncate"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="distance">Mileage (Closest)</option>
              <option value="rating">Star Rating</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedHierarchy('ALL');
                setMaxRadius('25');
                setSortBy('date_desc');
              }}
              className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs rounded-lg font-bold transition-all whitespace-nowrap"
            >
              × Clear
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <div className="text-slate-500 font-medium whitespace-nowrap">
              <span className="text-blue-600 font-black">{filteredAndSortedMembers.length}</span> members
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Members Grid */}
        {filteredAndSortedMembers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-xs">
            <p className="text-slate-400 text-sm font-medium">No members found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredAndSortedMembers.map((user: any) => {
              const { city: displayCity, church: displayChurch } = getMemberHierarchy(user);

              const reviewCount = user.reviews?.length || 0;
              const ratingVal = reviewCount > 0 
                ? (user.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewCount).toFixed(1) 
                : 'New';

              const joinedDate = new Date(user.createdAt || Date.now());
              const joinedDateFormatted = joinedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const displayDistance = `${user.distance ?? 0} mi`;

              return (
                <div key={user.id} className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-xs flex flex-col justify-between hover:border-slate-400 transition-all group">
                  <Link href={`/profile/${user.id}`} className="block">
                    <div className="h-52 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || 'Member'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e: any) => { 
                            e.target.style.display = 'none'; 
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-emerald-100 text-emerald-800 font-black text-3xl flex items-center justify-center">
                          {user.name ? user.name.charAt(0) : '👤'}
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                          {user.name}
                        </h3>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium mt-1 pb-2.5 border-b border-slate-100">
                          <span className="text-blue-600 inline-block filter hue-rotate-15">✝️</span>
                          <span>{displayCity} &gt; {displayChurch}</span>
                        </div>
                      </div>

                      <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                        {user.bio}
                      </p>
                    </div>
                  </Link>

                  <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="font-normal text-[11px] text-slate-500">
                      Joined: {joinedDateFormatted}
                    </span>
                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      ★ {ratingVal} ({reviewCount})
                    </span>
                  </div>

                  <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>👤</span>
                      <span>Profile</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-medium">
                      <span className="text-slate-500">📍 {displayDistance}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}