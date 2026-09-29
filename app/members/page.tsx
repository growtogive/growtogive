'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function MembersPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHierarchy, setSelectedHierarchy] = useState('ALL');
  const [maxRadius, setMaxRadius] = useState('25');
  const [sortBy, setSortBy] = useState('date_desc');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/listings');
      if (!res.ok) throw new Error('Failed to fetch marketplace data');
      const data = await res.json();
      const listings = Array.isArray(data) ? data : (data.listings || []);

      // Extract unique authors from listings and pull their actual profile avatar
      const userMap = new Map();
      listings.forEach((item: any) => {
        const authorName = item.authorName || item.author?.name || 'Community Member';
        const authorId = item.authorId || item.author?.id || authorName.toLowerCase().replace(/\s+/g, '-');

        if (!userMap.has(authorId)) {
          userMap.set(authorId, {
            id: authorId,
            name: authorName,
            city: item.city || item.author?.city || '',
            churchName: item.churchName || item.author?.churchName || item.author?.church || '',
            createdAt: item.createdAt || Date.now(),
            distance: item.distance ?? 0,
            reviews: item.reviews || [],
            // Fixed: Prioritize author/user avatar/image over listing imageUrl
            image: item.author?.avatar || item.author?.image || item.authorAvatar || '',
            bio: item.author?.bio || 'Community participant and member.',
          });
        }
      });

      setMembers(Array.from(userMap.values()));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load members.');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically build unique City > Church options sorted in alphabetical order
  const uniqueHierarchies = Array.from(
    new Set(
      members.map((user) => {
        const c = (user.city || '').trim();
        const ch = (user.churchName || '').trim();
        return c && ch ? `${c} > ${ch}` : c ? `${c} > General Church` : null;
      }).filter(Boolean)
    )
  ).sort((a: any, b: any) => a.localeCompare(b));

  // Filter and Sort Logic
  const filteredAndSortedMembers = useMemo(() => {
    let result = members.filter((user) => {
      const displayName = user.name || '';
      const displayCity = user.city || '';
      const displayChurch = user.churchName || '';

      const matchesSearch = 
        displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayChurch.toLowerCase().includes(searchTerm.toLowerCase());

      const userHierarchy = displayCity && displayChurch ? `${displayCity} > ${displayChurch}` : displayCity ? `${displayCity} > General Church` : '';
      const matchesHierarchy = selectedHierarchy === 'ALL' || userHierarchy === selectedHierarchy || displayCity === selectedHierarchy;

      const distanceVal = user.distance !== undefined && user.distance !== null ? Number(user.distance) : 0;
      const matchesDistance = maxRadius === 'ALL' || distanceVal <= Number(maxRadius);

      return matchesSearch && matchesHierarchy && matchesDistance;
    });

    // Sorting logic
    result.sort((a, b) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium text-lg">
        Loading members...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <main className="w-full pt-0 space-y-6">
        
        {/* Control Bar */}
        <div className="bg-white px-3 pt-[7px] pb-[7px] border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 bg-slate-50 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-84 shrink-0 font-medium"
            />

            <select
              value={selectedHierarchy}
              onChange={(e) => setSelectedHierarchy(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 bg-slate-50 text-xs rounded-lg font-medium cursor-pointer"
            >
              <option value="ALL">All Cities & Churches</option>
              {uniqueHierarchies.map((hier: any) => (
                <option key={hier} value={hier}>{hier}</option>
              ))}
            </select>

            <select
              value={maxRadius}
              onChange={(e) => setMaxRadius(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 bg-slate-50 text-xs rounded-lg font-medium cursor-pointer"
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
              className="px-2 py-1.5 border border-slate-200 bg-slate-50 text-xs rounded-lg font-medium cursor-pointer w-32 truncate"
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
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs rounded-lg font-bold transition-all whitespace-nowrap"
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
              const displayCity = (user.city || '').trim() || 'General City';
              const displayChurch = (user.churchName || '').trim() || 'Grace Family Church';

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