'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MarketplacePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedHierarchy, setSelectedHierarchy] = useState('ALL');
  const [maxRadius, setMaxRadius] = useState('25');
  const [activeReviewsItem, setActiveReviewsItem] = useState<any>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketplace');
      if (!res.ok) throw new Error('Failed to fetch listings');
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedType('ALL');
    setSelectedHierarchy('ALL');
    setMaxRadius('25');
  };

  const hierarchyMap: { [city: string]: Set<string> } = {};
  listings.forEach(item => {
    const city = (item.city || '').trim() || 'General City';
    const church = (item.churchName || '').trim() || 'Grace Family Church';
    if (!hierarchyMap[city]) {
      hierarchyMap[city] = new Set();
    }
    hierarchyMap[city].add(church);
  });

  const filteredListings = listings.filter((item) => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.churchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    
    let matchesType = true;
    if (selectedType === 'OFFERS') {
      matchesType = item.type === 'OFFER';
    } else if (selectedType === 'REQUESTS') {
      matchesType = item.type === 'REQUEST';
    } else if (selectedType === 'COMMERCIAL') {
      matchesType = item.type === 'SERVICE' || item.type === 'COMMERCIAL';
    }

    let matchesHierarchy = true;
    if (selectedHierarchy !== 'ALL') {
      const itemCity = (item.city || '').trim() || 'General City';
      const itemChurch = (item.churchName || '').trim() || 'Grace Family Church';

      if (selectedHierarchy.includes('::')) {
        const [targetCity, targetChurch] = selectedHierarchy.split('::');
        matchesHierarchy = itemCity === targetCity && itemChurch === targetChurch;
      } else {
        matchesHierarchy = itemCity === selectedHierarchy;
      }
    }

    let matchesRadius = true;
    if (item.distance && maxRadius !== 'ALL') {
      const distNum = parseFloat(item.distance);
      const radiusNum = parseFloat(maxRadius);
      if (!isNaN(distNum) && !isNaN(radiusNum)) {
        matchesRadius = distNum <= radiusNum;
      }
    }

    return matchesSearch && matchesCategory && matchesType && matchesHierarchy && matchesRadius;
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-6 py-3.5 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
            <Link href="/marketplace" className="flex items-center gap-2.5">
              <span className="text-2xl">🌱</span>
              <span className="text-xl font-bold tracking-tight text-slate-900">GrowToGive</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto flex-1 max-w-4xl justify-center">
            <div className="relative flex-1 min-w-[180px]">
              <input
                type="text"
                placeholder="Search items, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-white text-slate-900 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 border border-slate-200"
              />
              <span className="absolute right-2.5 top-2.5 text-slate-400 text-xs font-bold">🔍</span>
            </div>

            <select
              value={selectedHierarchy}
              onChange={(e) => setSelectedHierarchy(e.target.value)}
              className="px-3 py-2 bg-white text-slate-900 font-medium text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="ALL">All Cities & Churches</option>
              {Object.entries(hierarchyMap).map(([city, churches]) => (
                <optgroup key={city} label="">
                  <option value={city} className="font-semibold text-slate-900">{city}</option>
                  {Array.from(churches).map((church) => (
                    <option key={`${city}::${church}`} value={`${city}::${church}`}>
                      &nbsp;&nbsp;&nbsp;&nbsp;{church}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <select
              value={maxRadius}
              onChange={(e) => setMaxRadius(e.target.value)}
              className="px-3 py-2 bg-white text-slate-900 font-medium text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="5">Radius: 5 mi</option>
              <option value="10">Radius: 10 mi</option>
              <option value="25">Radius: 25 mi</option>
              <option value="50">Radius: 50 mi</option>
              <option value="100">Radius: 100 mi</option>
            </select>

            <button
              onClick={handleResetAll}
              className="px-3 py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-medium text-xs transition-all border border-slate-200 flex items-center gap-1 shrink-0 shadow-xs"
              title="Clear all filters and search"
            >
              <span className="text-sm font-bold">×</span> Clear
            </button>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <Link
              href="/listings/new"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-xs transition-all text-xs flex items-center gap-1.5 shrink-0"
            >
              <span>+</span> Create Listing
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-6 pt-8">
        <div className="bg-white p-5 border border-slate-200 shadow-sm mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'OFFERS', label: 'Offers' },
              { id: 'REQUESTS', label: 'Requests' },
              { id: 'COMMERCIAL', label: 'Commercial' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-4 py-2 text-xs font-semibold transition-all ${
                  selectedType === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-white text-slate-900 font-medium text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="GOODS">Goods & Produce</option>
                <option value="SERVICES">Services & Labor</option>
                <option value="SKILLS">Skills & Tutoring</option>
                <option value="RIDES">Transportation</option>
              </select>
            </div>

            <div className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3.5 py-2">
              Showing <span className="text-emerald-600 font-semibold">{filteredListings.length}</span> listings
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-medium text-lg">Loading marketplace listings...</div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 shadow-sm">
            <p className="text-slate-600 font-semibold text-lg mb-2">No listings found matching your search.</p>
            <p className="text-slate-400 text-sm mb-6">Try broadening your search terms or filters.</p>
            <button
              onClick={handleResetAll}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((item: any) => {
              const reviews = item.reviews || [];
              const reviewCount = reviews.length;
              const ratingVal = reviewCount > 0 
                ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewCount).toFixed(1) 
                : 'New';

              const displayChurch = (item.churchName || '').trim() || 'Grace Family Church';

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-slate-400 transition-all shadow-sm group"
                >
                  <Link href={`/listings/${item.id}`} className="block">
                    {item.imageUrl && (
                      <div className="h-52 w-full bg-slate-100 relative overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e: any) => { e.target.style.display = 'none'; }}
                        />
                        <span className={`absolute top-3 right-3 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide border shadow-sm ${
                          item.type === 'COMMERCIAL'
                            ? 'bg-sky-200 text-sky-800 border-sky-300'
                            : 'bg-slate-200 text-slate-800 border-slate-300'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                    )}

                    <div className="p-6 pb-2">
                      <h3 className="text-lg font-semibold text-black group-hover:text-slate-900 leading-snug transition-colors">
                        {item.title}
                      </h3>
                    </div>

                    <div className="p-6 pt-2">
                      <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed font-normal mb-4">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 truncate">
                          ⛪ {displayChurch}
                        </span>
                        <span className="text-sm font-semibold text-black shrink-0">
                          {Number(item.priceInBucks) > 0 ? `GB ${Number(item.priceInBucks).toFixed(2)}` : 'Free'}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex justify-between items-center text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2 truncate max-w-[55%]">
                      <span className="truncate text-xs">👤 {item.authorName || 'Member'}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveReviewsItem(item);
                        }}
                        className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 transition-colors cursor-pointer shadow-xs"
                        title="Click to view reviews"
                      >
                        <span className="text-amber-500 font-bold text-xs">★</span>
                        <span className="text-[11px] font-semibold text-slate-900">{ratingVal}</span>
                        <span className="text-[9px] text-slate-400">({reviewCount})</span>
                      </button>

                      <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 text-[11px]">{item.distance || '1.2'} mi</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Reviews Modal */}
      {activeReviewsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 p-8 max-w-lg w-full shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActiveReviewsItem(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-xl w-8 h-8 flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Feedback for {activeReviewsItem.authorName || 'Member'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Listing: {activeReviewsItem.title}</p>
              </div>
              <div className="ml-auto bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 font-semibold text-sm shrink-0">
                ★ {activeReviewsItem.reviews?.length > 0 ? (activeReviewsItem.reviews.reduce((a:number, b:any) => a + b.rating, 0) / activeReviewsItem.reviews.length).toFixed(1) : 'New'}
              </div>
            </div>

            <div className="space-y-4">
              {(!activeReviewsItem.reviews || activeReviewsItem.reviews.length === 0) ? (
                <p className="text-xs text-slate-500 text-center py-6">No reviews submitted for this listing yet. Be the first!</p>
              ) : (
                activeReviewsItem.reviews.map((rev: any) => (
                  <div key={rev.id} className="bg-white border border-slate-200 p-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-semibold text-slate-900 text-sm">{rev.author}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-500 font-semibold text-xs">{'★'.repeat(rev.rating)}</span>
                        <span className="text-slate-400 text-xs">{rev.date}</span>
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 flex gap-3">
              <Link
                href={`/users/${activeReviewsItem.authorId || activeReviewsItem.authorName?.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm text-center transition-colors shadow-xs"
              >
                View Full User Profile
              </Link>
              <button
                onClick={() => setActiveReviewsItem(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}