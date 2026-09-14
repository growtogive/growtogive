'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ChurchTaxonomyPage() {
  const params = useParams();
  const rawChurchName = params?.churchName as string;
  const churchName = rawChurchName ? decodeURIComponent(rawChurchName) : '';

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (churchName) {
      fetchListings();
    }
  }, [churchName]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/marketplace`);
      if (!res.ok) throw new Error('Failed to fetch marketplace data');
      const data = await res.json();
      
      const filtered = Array.isArray(data)
        ? data.filter(
            (item: any) =>
              item.churchName?.trim().toLowerCase() === churchName.trim().toLowerCase()
          )
        : [];
      setListings(filtered);
    } catch (err) {
      console.error(err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium text-lg">
        Loading church listings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center gap-4">
          <Link href="/marketplace" className="flex items-center gap-2.5">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-black tracking-tight text-slate-900">GrowToGive</span>
          </Link>
          <Link
            href="/marketplace"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
          >
            ← Back to Marketplace
          </Link>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-6 pt-10">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 inline-block mb-3">
            Church Fellowship
          </span>
          <h1 className="text-3xl font-black text-slate-900">{churchName}</h1>
          <p className="text-slate-600 text-sm mt-1">
            Browse all community listings and support offers associated with this church fellowship.
          </p>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-2">No listings found for &quot;{churchName}&quot;</h2>
            <p className="text-slate-500 text-sm mb-6">There are currently no active listings for this church.</p>
            <Link
              href="/marketplace"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md inline-block"
            >
              Explore Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listings.map((item) => (
              <div key={item.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                {item.imageUrl && (
                  <div className="h-48 w-full bg-slate-100 relative">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e: any) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {item.type}
                    </span>
                    <span className="text-xs font-bold text-slate-500">📍 {item.distance || '1.2'} miles</span>
                  </div>

                  <h2 className="text-xl font-black text-slate-900 mb-2">
                    <Link href={`/listings/${item.id}`} className="hover:text-emerald-700 transition-colors">
                      {item.title}
                    </Link>
                  </h2>

                  <p className="text-slate-600 text-sm line-clamp-2 mb-6 flex-1">
                    {item.description}
                  </p>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-lg font-black text-emerald-700">
                      {Number(item.priceInBucks) > 0 ? `${Number(item.priceInBucks).toFixed(2)} GrowBucks` : 'Free'}
                    </span>
                    <Link
                      href={`/listings/${item.id}`}
                      className="px-4 py-2 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800 font-bold rounded-xl text-xs transition-all"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}