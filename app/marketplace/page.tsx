'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { LISTING_CATEGORIES } from '@/lib/constants/categories';

export default function MarketplacePage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
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

  // Filter and Sort Logic using API-calculated item.distance
  const filteredAndSortedListings = useMemo(() => {
    let result = listings.filter((item) => {
      const matchesSearch = 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.city?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'ALL' || item.type?.toUpperCase() === selectedType.toUpperCase();
      const matchesCategory = selectedCategory === 'ALL' || item.category?.toUpperCase() === selectedCategory.toUpperCase();
      
      const displayCity = (item.city || item.author?.city || '').trim();
      const displayChurch = (item.churchName || item.author?.churchName || item.author?.church || '').trim();
      const itemHierarchy = `${displayCity} > ${displayChurch}`;
      const matchesHierarchy = selectedHierarchy === 'ALL' || itemHierarchy === selectedHierarchy || displayCity === selectedHierarchy;

      const distanceVal = item.distance !== undefined && item.distance !== null ? Number(item.distance) : 0;
      const matchesDistance = maxRadius === 'ALL' || distanceVal <= Number(maxRadius);

      return matchesSearch && matchesType && matchesCategory && matchesHierarchy && matchesDistance;
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
  }, [listings, searchTerm, selectedType, selectedCategory, selectedHierarchy, maxRadius, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium text-lg">
        Loading marketplace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <main className="w-full pt-6 space-y-6">
        
        {/* Main Control Bar */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search items, skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 w-64 font-medium"
          />

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedHierarchy}
              onChange={(e) => setSelectedHierarchy(e.target.value)}
              className="px-3 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg font-medium cursor-pointer"
            >
              <option value="ALL">All Cities & Churches</option>
              {uniqueHierarchies.map((hier: any) => (
                <option key={hier} value={hier}>{hier}</option>
              ))}
            </select>

            <select
              value={maxRadius}
              onChange={(e) => setMaxRadius(e.target.value)}
              className="px-3 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg font-medium cursor-pointer"
            >
              <option value="5">Radius: 5 mi</option>
              <option value="10">Radius: 10 mi</option>
              <option value="25">Radius: 25 mi</option>
              <option value="50">Radius: 50 mi</option>
              <option value="100">Radius: 100 mi</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg font-medium cursor-pointer"
            >
              <option value="date_desc">Sort: Newest First</option>
              <option value="date_asc">Sort: Oldest First</option>
              <option value="distance">Sort: Mileage (Closest)</option>
              <option value="price_asc">Sort: Amount (Low to High)</option>
              <option value="price_desc">Sort: Amount (High to Low)</option>
              <option value="rating">Sort: Star Rating</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('ALL');
                setSelectedCategory('ALL');
                setSelectedHierarchy('ALL');
                setMaxRadius('25');
                setSortBy('date_desc');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg font-bold transition-all"
            >
              × Clear
            </button>

            <Link
              href="/listings/new"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-all shadow-xs"
            >
              NEW+
            </Link>
          </div>
        </div>

        {/* Secondary Category & Tab Navigation Bar */}
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-4 py-1.5 rounded-md font-bold transition-all ${selectedType === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedType('OFFER')}
              className={`px-4 py-1.5 rounded-md font-bold transition-all ${selectedType === 'OFFER' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Offers
            </button>
            <button
              onClick={() => setSelectedType('REQUEST')}
              className={`px-4 py-1.5 rounded-md font-bold transition-all ${selectedType === 'REQUEST' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Requests
            </button>
            <button
              onClick={() => setSelectedType('COMMERCIAL')}
              className={`px-4 py-1.5 rounded-md font-bold transition-all ${selectedType === 'COMMERCIAL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Commercial
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">CATEGORY:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg font-bold text-slate-700 cursor-pointer text-xs"
              >
                <option value="ALL">All Categories (34)</option>
                {LISTING_CATEGORIES.map((catName) => (
                  <option key={catName} value={catName}>
                    {catName}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-500 font-medium">
              Showing <span className="text-emerald-600 font-black">{filteredAndSortedListings.length}</span> listings
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Listings Grid: Max 4 columns wide */}
        {filteredAndSortedListings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-xs">
            <p className="text-slate-400 text-sm font-medium">No marketplace listings found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredAndSortedListings.map((item: any) => {
              const isCommercial = item.type === 'COMMERCIAL';
              const displayCity = (item.city || item.author?.city || '').trim() || 'General City';
              const displayChurch = (item.churchName || item.author?.churchName || item.author?.church || '').trim() || 'Grace Family Church';
              const priceDisplay = !isCommercial ? `GB ${Number(item.priceInBucks || 0).toFixed(2)}` : null;

              const reviewCount = item.reviews?.length || 0;
              const ratingVal = reviewCount > 0 
                ? (item.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewCount).toFixed(1) 
                : 'New';

              const createdDate = new Date(item.createdAt || Date.now());
              const createdDateFormatted = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              
              const expDate = new Date(createdDate);
              expDate.setDate(expDate.getDate() + 14);
              const expirationDateFormatted = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              const displayDistance = `${item.distance ?? 0} mi`;

              return (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
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
                          <span className="text-blue-600">✝️</span>
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