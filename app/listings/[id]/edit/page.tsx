'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { LISTING_CATEGORIES } from '@/lib/constants/categories';

declare global {
  interface Window {
    google: any;
  }
}

function formatListingTitle(title: string): string {
  if (!title) return '';
  const minorWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'with', 'in']);
  
  return title
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && minorWords.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'OFFER',
    category: '',
    priceInBucks: '0.00',
    imageUrl: '',
    location: '',
    businessHours: '',
    latitude: 27.4989,
    longitude: -82.5648,
  });

  const [originalType, setOriginalType] = useState('OFFER');
  const [hasOtherCommercial, setHasOtherCommercial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');

  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (listingId) {
      fetchListingData();
    }
  }, [listingId]);

  useEffect(() => {
    if (loading || formData.type !== 'COMMERCIAL') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    if (!window.google || !window.google.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = initAutocomplete;
      document.body.appendChild(script);
    } else {
      initAutocomplete();
    }
  }, [loading, formData.type]);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode'],
      componentRestrictions: { country: 'us' },
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || inputRef.current?.value || '';

        setFormData((prev) => ({
          ...prev,
          location: address,
          latitude: lat,
          longitude: lng,
        }));
      }
    });
  };

  const fetchListingData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/listings/${listingId}`);
      if (!res.ok) throw new Error('Failed to load listing details.');
      const data = await res.json();
      const listing = data.listing || data;

      setFormData({
        title: formatListingTitle(listing.title || ''),
        description: listing.description || '',
        type: listing.type || 'OFFER',
        category: listing.category || '',
        priceInBucks: listing.priceInBucks?.toString() || '0.00',
        imageUrl: listing.imageUrl || '',
        location: listing.location || '',
        businessHours: listing.businessHours || '',
        latitude: listing.latitude ?? 27.4989,
        longitude: listing.longitude ?? -82.5648,
      });
      setOriginalType(listing.type || 'OFFER');

      const authorId = listing.authorId || listing.author?.id;
      const allRes = await fetch('/api/listings');
      if (allRes.ok) {
        const listings = await allRes.json();
        const commercialExists = listings.some(
          (l: any) => l.type === 'COMMERCIAL' && l.id !== listingId && (l.authorId === authorId || l.userId === authorId)
        );
        setHasOtherCommercial(commercialExists);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setError('');

    if (newType === 'COMMERCIAL' && originalType !== 'COMMERCIAL') {
      try {
        const res = await fetch('/api/listings');
        if (res.ok) {
          const listings = await res.json();
          const hasCommercial = listings.some((l: any) => l.type === 'COMMERCIAL' && l.id !== listingId);
          if (hasCommercial) {
            setHasOtherCommercial(true);
            setError('⚠️ You are allowed only one active commercial listing. You cannot switch to Commercial.');
            return;
          }
        }
      } catch (err) {
        console.error('Failed to verify commercial status', err);
      }
    }

    setFormData((prev) => ({ ...prev, type: newType }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.name === 'title') {
      setFormData((prev) => ({
        ...prev,
        title: formatListingTitle(e.target.value),
      }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select an image under 5MB.');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
        setUploadingImage(false);
      };
      reader.onerror = () => {
        setError('Failed to read image file.');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error uploading image.');
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.type === 'COMMERCIAL' && originalType !== 'COMMERCIAL' && hasOtherCommercial) {
      setError('⚠️ Action blocked: This author already has an active commercial listing.');
      return;
    }

    if (!formData.category) {
      setError('Please select a valid category.');
      return;
    }

    if (formData.type === 'COMMERCIAL') {
      if (!formData.location) {
        setError('Storefront location address is required for Commercial listings.');
        return;
      }
      if (!formData.businessHours) {
        setError('Business hours are required for Commercial listings.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const formattedTitle = formatListingTitle(formData.title);

      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          title: formattedTitle,
          priceInBucks: formData.type === 'COMMERCIAL' ? 0 : (parseFloat(formData.priceInBucks) || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update listing.');

      router.push(`/listings/${listingId}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium text-sm">
        Loading listing details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm p-8 sm:p-10">
        
        <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Marketplace Listing</h1>
            <p className="text-slate-500 text-xs mt-0.5">Update your item, service, or community offering details.</p>
          </div>
          <Link href={`/listings/${listingId}`} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
            Cancel
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Listing Title</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              onBlur={handleTitleBlur}
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Listing Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleTypeChange}
                className="w-full px-3 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                <option value="OFFER">Offer</option>
                <option value="REQUEST">Request</option>
                <option value="COMMERCIAL">Commercial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Category *</label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                <option value="" disabled>
                  Select category...
                </option>
                {LISTING_CATEGORIES.map((catName) => (
                  <option key={catName} value={catName}>
                    {catName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.type !== 'COMMERCIAL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Growbucks Amount</label>
              <input
                type="number"
                step="0.01"
                name="priceInBucks"
                required
                value={formData.priceInBucks}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          )}

          {formData.type === 'COMMERCIAL' && (
            <div className="space-y-6 p-5 bg-sky-50/50 border border-sky-200 rounded-lg">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Storefront Location / Address *
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Start typing business address..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Business Hours *
                </label>
                <input
                  type="text"
                  name="businessHours"
                  required
                  value={formData.businessHours}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="e.g. Mon-Fri 9am - 5pm, Sat 10am - 2pm"
                />
              </div>
            </div>
          )}

          <input type="hidden" name="latitude" value={formData.latitude} />
          <input type="hidden" name="longitude" value={formData.longitude} />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Listing Image (Upload from Device)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Listing Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>
            </div>
            {uploadingImage && <p className="text-xs text-emerald-600 mt-1">Processing image...</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Description</label>
            <textarea
              name="description"
              rows={4}
              required
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              href={`/listings/${listingId}`}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving Changes...' : 'Save Listing'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}