'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function MarketplacePage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedHierarchy, setSelectedHierarchy] = useState('ALL');
  const [maxRadius, setMaxRadius] = useState('25');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/listings', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Failed to fetch marketplace listings');
      const data = await res.json();
      
      const listingsArray = Array.isArray(data) ? data : (data.listings || []);
      setListings(listingsArray);
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

  const filteredListings = listings.filter((item) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium text-lg">
        Loading marketplace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* Main Control Bar (Search, City>Church, Radius, Clear, Create Listing) */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-black text-slate-900 text-base">
            <span>🌱</span> GrowToGive
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1 max-w-4xl justify-end">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search items, skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 w-64 font-medium"
            />

            {/* Alphabetized City & Church Hierarchy Dropdown */}
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

            {/* Radius Selector (Without Any Distance) */}
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

            {/* Clear Button */}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('ALL');
                setSelectedCategory('ALL');
                setSelectedHierarchy('ALL');
                setMaxRadius('25');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg font-bold transition-all"
            >
              × Clear
            </button>

            {/* Create Listing Button */}
            <Link
              href="/listings/new"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-all shadow-xs"
            >
              + Create Listing
            </Link>
          </div>
        </div>

        {/* Secondary Category & Tab Navigation Bar */}
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Type Tabs */}
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

          {/* Category Dropdown & Listing Count */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">CATEGORY:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg font-bold text-slate-700 cursor-pointer text-xs"
              >
                <option value="ALL">All Categories</option>
                <option value="GOODS">Goods</option>
                <option value="SERVICES">Services</option>
              </select>
            </div>

            <div className="text-slate-500 font-medium">
              Showing {filteredListings.length} listings
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-xs">
            <p className="text-slate-400 text-sm font-medium">No marketplace listings found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((item: any) => {
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

              const displayDistance = item.distance !== undefined && item.distance !== null ? `${item.distance} mi` : '0 mi';

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
                        {/* Title Bar */}
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors leading-snug">
                          {item.title}
                        </h3>
                        {/* City > Church below title bar with cross icon */}
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium mt-1">
                          <span>✝️</span>
                          <span>{displayCity} &gt; {displayChurch}</span>
                        </div>
                      </div>

                      <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </Link>

                  {/* Price Bar combined with Listing / Expiration Date */}
                  <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{priceDisplay}</span>
                    <span className="font-normal text-[11px] text-slate-500">
                      {isCommercial ? `Created: ${createdDateFormatted}` : `Expires: ${expirationDateFormatted}`}
                    </span>
                  </div>

                  {/* Card Footer Metadata Row */}
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