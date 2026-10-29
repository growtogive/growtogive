// app/marketplace/page.tsx
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import useSWR from 'swr';
import { LISTING_CATEGORIES } from '@/lib/constants/categories';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Strict rule: City > Church text ALWAYS comes from the author profile
const getAuthorHierarchy = (item: any) => {
  const city = (item.author?.city || '').trim();
  const church = (item.author?.churchName || item.author?.church || '').trim();
  
  const displayCity = city || 'General City';
  const displayChurch = church || 'General Church';
  
  return {
    city: displayCity,
    church: displayChurch,
    hierarchyString: `${displayCity} > ${displayChurch}`
  };
};

export default function MarketplacePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  // SWR handles in-memory client-side caching for instant back/forward navigation without re-fetching
  const { data, error: swrError, isLoading } = useSWR('/api/listings', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Caches data in memory for 1 minute
  });

  const listings = Array.isArray(data) ? data : (data?.listings || []);
  const error = swrError ? (swrError.message || 'Failed to load marketplace.') : '';
  
  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['OFFER', 'REQUEST', 'COMMERCIAL']);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedHierarchy, setSelectedHierarchy] = useState('ALL');
  const [maxRadius, setMaxRadius] = useState('25');
  const [sortBy, setSortBy] = useState('date_desc');

  // Autocomplete dropdown state for City / Church filter
  const [hierarchySearchInput, setHierarchySearchInput] = useState('');
  const [isHierarchyDropdownOpen, setIsHierarchyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsHierarchyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamically build grouped & sorted options: City, then City > Church 1, City > Church 2, etc.
  const groupedHierarchyOptions = useMemo(() => {
    const citiesMap = new Map<string, Set<string>>();

    listings.forEach((item: any) => {
      const { city, church } = getAuthorHierarchy(item);
      if (item.author?.city || item.author?.churchName || item.author?.church) {
        if (city && city !== 'General City') {
          if (!citiesMap.has(city)) {
            citiesMap.set(city, new Set());
          }
          if (church && church !== 'General Church') {
            citiesMap.get(city)?.add(church);
          }
        }
      }
    });

    const sortedCities = Array.from(citiesMap.keys()).sort((a, b) => a.localeCompare(b));
    const list: { label: string; value: string; type: 'city' | 'hierarchy' }[] = [];

    sortedCities.forEach((city) => {
      // Add City Only option
      list.push({ label: `${city} (All)`, value: city, type: 'city' });

      // Add sorted Churches under this city
      const churches = Array.from(citiesMap.get(city) || []).sort((a, b) => a.localeCompare(b));
      churches.forEach((church) => {
        const hierStr = `${city} > ${church}`;
        list.push({ label: hierStr, value: hierStr, type: 'hierarchy' });
      });
    });

    return list;
  }, [listings]);

  // Filtered list based on user typing in the autocomplete box
  const filteredHierarchyOptions = useMemo(() => {
    if (!hierarchySearchInput.trim()) return groupedHierarchyOptions;
    const query = hierarchySearchInput.toLowerCase();
    return groupedHierarchyOptions.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [groupedHierarchyOptions, hierarchySearchInput]);

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

  // Filter and Sort Logic
  const filteredAndSortedListings = useMemo(() => {
    let result = listings.filter((item: any) => {
      const matchesSearch = 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.author?.city?.toLowerCase().includes(searchTerm.toLowerCase());

      const itemType = item.type?.toUpperCase() || '';
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(itemType);
      const matchesCategory = selectedCategory === 'ALL' || item.category?.toUpperCase() === selectedCategory.toUpperCase();
      
      const { city: displayCity, hierarchyString: itemHierarchy } = getAuthorHierarchy(item);
      
      const matchesHierarchy = 
        selectedHierarchy === 'ALL' || 
        itemHierarchy === selectedHierarchy || 
        displayCity.toLowerCase() === selectedHierarchy.toLowerCase();

      const distanceVal = item.distance !== undefined && item.distance !== null ? Number(item.distance) : 0;
      const matchesDistance = maxRadius === 'ALL' || distanceVal <= Number(maxRadius);

      return matchesSearch && matchesType && matchesCategory && matchesHierarchy && matchesDistance;
    });

    // Sorting logic with priority tiers
    result.sort((a: any, b: any) => {
      const aCommercial = (a.isCommercial || a.type === 'COMMERCIAL') ? 1 : 0;
      const bCommercial = (b.isCommercial || b.type === 'COMMERCIAL') ? 1 : 0;
      if (aCommercial !== bCommercial) return bCommercial - aCommercial;

      const aFeatured = a.isFeatured ? 1 : 0;
      const bFeatured = b.isFeatured ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium text-lg">
        Loading marketplace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <main className="w-full pt-1 space-y-4 px-3 sm:px-6">
        
        {/* Header & Subheading */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-500">
              MARKETPLACE
            </h1>
            <h2 className="text-sm sm:text-base font-medium text-gray-500">
              for Church Members and Friends • Trade with GROWBUCKS not your bucks!
            </h2>
          </div>
        </div>

        {/* Control Bar (Expanded & Responsive for Mobile) */}
        <div className="bg-white p-3.5 sm:px-3 sm:py-3.75 border-b-2 border-gray-400 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
            
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-3 sm:py-2 border border-slate-300 bg-slate-50 text-base sm:text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-full sm:w-60 min-w-50 shrink-0 font-medium"
            />

            {/* Searchable Autocomplete City / Church Filter */}
            <div className="relative w-full sm:w-64 min-w-55 shrink-0" ref={dropdownRef}>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Filter City / Church..."
                  value={hierarchySearchInput}
                  onChange={(e) => {
                    setHierarchySearchInput(e.target.value);
                    setIsHierarchyDropdownOpen(true);
                  }}
                  onFocus={() => setIsHierarchyDropdownOpen(true)}
                  className="w-full px-3.5 py-3 sm:py-2 pr-8 border border-slate-300 bg-slate-50 text-base sm:text-xs rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 truncate"
                />
                {selectedHierarchy !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHierarchy('ALL');
                      setHierarchySearchInput('');
                    }}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-700 font-bold text-sm"
                    title="Clear City Filter"
                  >
                    ×
                  </button>
                )}
              </div>

              {isHierarchyDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-xs">
                  <div
                    onClick={() => {
                      setSelectedHierarchy('ALL');
                      setHierarchySearchInput('');
                      setIsHierarchyDropdownOpen(false);
                    }}
                    className="px-3.5 py-2.5 hover:bg-slate-100 cursor-pointer font-semibold text-blue-600 border-b border-slate-100"
                  >
                    All Cities & Churches
                  </div>
                  {filteredHierarchyOptions.length === 0 ? (
                    <div className="px-3.5 py-3 text-slate-400 text-center">No matching cities found</div>
                  ) : (
                    filteredHierarchyOptions.map((opt) => (
                      <div
                        key={opt.value}
                        onClick={() => {
                          setSelectedHierarchy(opt.value);
                          setHierarchySearchInput(opt.label);
                          setIsHierarchyDropdownOpen(false);
                        }}
                        className={`px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer truncate ${
                          opt.type === 'city' ? 'font-bold text-slate-900 bg-slate-50/50' : 'pl-6 text-slate-700'
                        }`}
                      >
                        {opt.label}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Type Checkboxes */}
            <div className="flex items-center justify-around sm:justify-start gap-4 px-4 py-3 sm:py-2 border border-sky-200 bg-sky-50 rounded-lg w-full sm:w-auto min-w-52.5 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs sm:text-xs text-sky-900">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes('OFFER')}
                  onChange={() => toggleType('OFFER')}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
                Offers
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs sm:text-xs text-sky-900">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes('REQUEST')}
                  onChange={() => toggleType('REQUEST')}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
                Requests
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs sm:text-xs text-sky-900">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes('COMMERCIAL')}
                  onChange={() => toggleType('COMMERCIAL')}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
                />
                Commercial
              </label>
            </div>

            {/* Radius Select */}
            <select
              value={maxRadius}
              onChange={(e) => setMaxRadius(e.target.value)}
              className="px-3.5 py-3 sm:py-2 border border-slate-300 bg-slate-50 text-base sm:text-xs rounded-lg font-medium cursor-pointer w-full sm:w-auto min-w-25 shrink-0"
            >
              <option value="5">5 mi</option>
              <option value="10">10 mi</option>
              <option value="25">25 mi</option>
              <option value="50">50 mi</option>
              <option value="100">100 mi</option>
            </select>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-3 sm:py-2 border border-slate-300 bg-slate-50 rounded-lg font-bold text-slate-700 cursor-pointer text-base sm:text-xs w-full sm:w-auto min-w-42.5 shrink-0"
            >
              <option value="ALL">All Categories (34)</option>
              {LISTING_CATEGORIES.map((catName) => (
                <option key={catName} value={catName}>
                  {catName}
                </option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-3 sm:py-2 border border-slate-300 bg-slate-50 text-base sm:text-xs rounded-lg font-medium cursor-pointer w-full sm:w-auto min-w-37.5 shrink-0"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="distance">Mileage (Closest)</option>
              <option value="price_asc">Amount (Low to High)</option>
              <option value="price_desc">Amount (High to Low)</option>
              <option value="rating">Star Rating</option>
            </select>

            {/* Clear Button */}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTypes(['OFFER', 'REQUEST', 'COMMERCIAL']);
                setSelectedCategory('ALL');
                setSelectedHierarchy('ALL');
                setHierarchySearchInput('');
                setMaxRadius('25');
                setSortBy('date_desc');
              }}
              className="px-4 py-3 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs rounded-lg font-bold transition-all w-full sm:w-auto text-center shrink-0"
            >
              X Clear
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            <div className="text-slate-500 font-medium whitespace-nowrap text-xs sm:text-xs">
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
              
              const getBorderClass = () => {
                if (isCommercial) return 'border-2 border-blue-600 shadow-md';
                if (isFeatured) return 'border-2 border-amber-400 bg-amber-50/20 shadow-md';
                return 'border border-slate-300';
              };

              const { city: displayCity, church: displayChurch } = getAuthorHierarchy(item);
              const priceDisplay = !isCommercial ? `GB ${Number(item.priceInBucks || 0).toFixed(2)}` : null;

              const reviewCount = item.reviews?.length || 0;
              const createdDate = new Date(item.createdAt || Date.now());
              const isWithin24Hours = (Date.now() - createdDate.getTime()) <= (24 * 60 * 60 * 1000);
              
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
                  <Link href={`/listings/${item.slug || item.id}`} className="block">
                    <div className="h-52 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={primaryImage}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e: any) => { 
                          e.target.src = 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'; 
                        }}
                      />
                      
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                        <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                          isCommercial ? 'bg-sky-100 text-blue-800 border-sky-300' : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {item.type}
                        </span>
                        {isFeatured && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide shadow-xs">
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