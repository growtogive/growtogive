'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { LISTING_CATEGORIES } from '@/lib/constants/categories';

export default function MarketplacePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['OFFER', 'REQUEST', 'COMMERCIAL']);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedHierarchy, setSelectedHierarchy] = useState('ALL');
  const [maxRadius, setMaxRadius] = useState('25');
  const [sortBy, setSortBy] = useState('date_desc');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/listings');
      if (!res.ok) throw new Error('Failed to fetch marketplace listings');
      const data = await res.json();
      setListings(Array.isArray(data) ? data : (data.listings || []));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load marketplace.');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically build unique City > Church options sorted in alphabetical order
  const uniqueHierarchies = Array.from(
    new Set(
      listings.map((item) => {
        const c = (item.city || item.author?.city || '').trim();
        const ch = (item.churchName || item.author?.churchName || item.author?.church || '').trim();
        return c && ch ? `${c} > ${ch}` : c ? `${c} > General Church` : null;
      }).filter(Boolean)
    )
  ).sort((a: any, b: any) => a.localeCompare(b));

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length === 1) {
        setSelectedTypes(['OFFER', 'REQUEST', 'COMMERCIAL']);
      } else {
        setSelectedTypes(selectedTypes.filter(t => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  // Filter and Sort Logic: Commercial listings first, then Featured offers/requests, then Standard
  const filteredAndSortedListings = useMemo(() => {
    let result = listings.filter((item) => {
      const matchesSearch = 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.city?.toLowerCase().includes(searchTerm.toLowerCase());

      const itemType = item.type?.toUpperCase() || '';
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(itemType);
      const matchesCategory = selectedCategory === 'ALL' || item.category?.toUpperCase() === selectedCategory.toUpperCase();
      
      const displayCity = (item.city || item.author?.city || '').trim();
      const displayChurch = (item.churchName || item.author?.churchName || item.author?.church || '').trim();
      const itemHierarchy = `${displayCity} > ${displayChurch}`;
      const matchesHierarchy = selectedHierarchy === 'ALL' || itemHierarchy === selectedHierarchy || displayCity === selectedHierarchy;

      const distanceVal = item.distance !== undefined && item.distance !== null ? Number(item.distance) : 0;
      const matchesDistance = maxRadius === 'ALL' || distanceVal <= Number(maxRadius);

      return matchesSearch && matchesType && matchesCategory && matchesHierarchy && matchesDistance;
    });

    // Sorting logic with precise priority tiers
    result.sort((a, b) => {
      // 1. Commercial listings get highest priority at the top
      const aCommercial = (a.isCommercial || a.type === 'COMMERCIAL') ? 1 : 0;
      const bCommercial = (b.isCommercial || b.type === 'COMMERCIAL') ? 1 : 0;
      if (aCommercial !== bCommercial) return bCommercial - aCommercial;

      // 2. Featured offers and requests get second priority
      const aFeatured = a.isFeatured ? 1 : 0;
      const bFeatured = b.isFeatured ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;

      // 3. Secondary user-selected sort
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'date_asc':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'distance':
          return (a.distance ?? 999) - (b.distance ?? 999);
        case 'price_asc':
          return (Number(a.priceInBucks) || 0) - (Number(b.priceInBucks) || 0);
        case 'price_desc':
          return (Number(b.priceInBucks) || 0) - (Number(a.priceInBucks) || 0);
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
  }, [listings, searchTerm, selectedTypes, selectedCategory, selectedHierarchy, maxRadius, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium text-lg">
        Loading marketplace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <main className="w-full pt-1 space-y-4 px-[10px] sm:px-6">
        
        {/* Gray Header & Subheading with Members Button on Far Right */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-500">
              DIRECTORY & MARKETPLACE
            </h1>
            <h2 className="text-sm sm:text-base font-medium text-gray-500">
              for Church Members and Friends • Trade with GROWBUCKS not your bucks!
            </h2>
          </div>

          <Link
            href="/members"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all shadow-xs ${
              pathname?.startsWith('/members') 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <svg className={`w-4 h-4 shrink-0 ${pathname?.startsWith('/members') ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Members</span>
          </Link>
        </div>

        {/* Control Bar */}
        <div className="bg-white px-3 pt-[15px] pb-[15px] border-b-[2px] border-gray-400 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <input
              type="text"
              placeholder="Search..."
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

            <div className="flex items-center gap-2 px-2.5 py-2 border border-sky-200 bg-sky-50 rounded-lg">
              <label className="flex items-center gap-1 cursor-pointer font-medium text-[11px] text-sky-900">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes('OFFER')}
                  onChange={() => toggleType('OFFER')}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                />
                Offers
              </label>
              <label className="flex items-center gap-1 cursor-pointer font-medium text-[11px] text-sky-900">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes('REQUEST')}
                  onChange={() => toggleType('REQUEST')}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                />
                Requests
              </label>
              <label className="flex items-center gap-1 cursor-pointer font-medium text-[11px] text-sky-900">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes('COMMERCIAL')}
                  onChange={() => toggleType('COMMERCIAL')}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                />
                Commercial
              </label>
            </div>

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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-2 border border-slate-200 bg-slate-50 rounded-lg font-bold text-slate-700 cursor-pointer text-xs"
            >
              <option value="ALL">All Categories (34)</option>
              {LISTING_CATEGORIES.map((catName) => (
                <option key={catName} value={catName}>
                  {catName}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg font-medium cursor-pointer w-32 truncate"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="distance">Mileage (Closest)</option>
              <option value="price_asc">Amount (Low to High)</option>
              <option value="price_desc">Amount (High to Low)</option>
              <option value="rating">Star Rating</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTypes(['OFFER', 'REQUEST', 'COMMERCIAL']);
                setSelectedCategory('ALL');
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
              <span className="text-blue-600 font-black">{filteredAndSortedListings.length}</span> listings
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Listings Grid */}
        {filteredAndSortedListings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-xs">
            <p className="text-slate-400 text-sm font-medium">No marketplace listings found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredAndSortedListings.map((item: any) => {
              const isCommercial = item.type === 'COMMERCIAL' || item.isCommercial;
              const isFeatured = item.isFeatured;
              
              // Border Styling: Dark blue for commercial, Light blue for featured offers/requests
              const getBorderClass = () => {
                if (isCommercial) return 'border-2 border-blue-900 shadow-md';
                if (isFeatured) return 'border-2 border-sky-300 shadow-sm';
                return 'border-2 border-slate-300';
              };

              const displayCity = (item.city || item.author?.city || '').trim() || 'General City';
              const displayChurch = (item.churchName || item.author?.churchName || item.author?.church || '').trim() || 'Grace Family Church';
              const priceDisplay = !isCommercial ? `GB ${Number(item.priceInBucks || 0).toFixed(2)}` : null;

              const reviewCount = item.reviews?.length || 0;
              
              const createdDate = new Date(item.createdAt || Date.now());
              const isWithin24Hours = (Date.now() - createdDate.getTime()) <= 24 * 60 * 60 * 1000;
              
              const ratingVal = reviewCount > 0 
                ? (item.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewCount).toFixed(1) 
                : isWithin24Hours 
                  ? 'New' 
                  : '0.0';

              const createdDateFormatted = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              
              const expDate = new Date(item.expiresAt || createdDate);
              const expirationDateFormatted = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              const displayDistance = `${item.distance ?? 0} mi`;
              
              const primaryImage = (item.images && item.images.length > 0) ? item.images[0] : (item.imageUrl || 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available');

              return (
                <div key={item.id} className={`bg-white rounded-xl overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-all group ${getBorderClass()}`}>
                  <Link href={`/listings/${item.id}`} className="block">
                    <div className="h-52 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={primaryImage}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e: any) => { 
                          e.target.src = 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'; 
                        }}
                      />
                      
                      {/* Top Right Badges */}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                        <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                          isCommercial ? 'bg-sky-100 text-blue-800 border-sky-300' : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {item.type}
                        </span>
                        {/* Light blue Featured Badge on ANY listing that is featured */}
                        {isFeatured && (
                          <span className="bg-sky-100 text-blue-900 border border-sky-300 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide shadow-xs">
                            Featured
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
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
                      {isCommercial ? `Created: ${createdDateFormatted}` : `Expires: ${expirationDateFormatted}`}
                    </span>
                  </div>

                  <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>👤</span>
                      <span>{item.author?.name || 'GTG Admin'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-medium">
                      <span className="text-slate-500">📍 {displayDistance}</span>
                      <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ★ {ratingVal} ({reviewCount})
                      </span>
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