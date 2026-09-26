'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewListingPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'OFFER',      // Default to OFFER
    category: '',       // Default to blank
    priceInBucks: '',
    imageUrl: '',
    location: '',       // Required only for Commercial
    city: 'Bradenton',
    latitude: 27.4989,
    longitude: -82.5648,
    businessHours: '',  // Required only for Commercial
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-initialize Google Maps Autocomplete when COMMERCIAL is selected
  useEffect(() => {
    if (formData.type === 'COMMERCIAL') {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

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

            let detectedCity = formData.city;
            if (place.address_components) {
              for (const comp of place.address_components) {
                if (comp.types.includes('locality')) {
                  detectedCity = comp.long_name;
                }
              }
            }

            setFormData((prev) => ({
              ...prev,
              location: address,
              latitude: lat,
              longitude: lng,
              city: detectedCity,
            }));
          }
        });
      };

      if (!window.google || !window.google.maps) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.onload = initAutocomplete;
        document.body.appendChild(script);
      } else {
        setTimeout(initAutocomplete, 100);
      }
    }
  }, [formData.type]);

  // Immediate check when user selects COMMERCIAL
  const handleTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setFormData((prev) => ({ ...prev, type: newType }));
    setError('');

    if (newType === 'COMMERCIAL') {
      try {
        const res = await fetch('/api/listings');
        if (res.ok) {
          const listings = await res.json();
          const hasCommercial = listings.some((l: any) => l.type === 'COMMERCIAL' && l.distance === 0);
          if (hasCommercial) {
            setError('⚠️ You are already allowed only one active commercial listing. You cannot select Commercial.');
          }
        }
      } catch (err) {
        console.error('Failed to verify commercial status', err);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

    if (!formData.title || !formData.description || !formData.category) {
      setError('Title, Description, and Category are required.');
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

    if (formData.type !== 'COMMERCIAL' && !formData.priceInBucks) {
      setError('Amount is required for Offers and Requests.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create listing.');
      }

      // Redirect straight to the new listing's page for review/editing
      router.push(`/listings/${data.listing.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm p-8 sm:p-10">
        
        <div className="text-center mb-8">
          <Link href="/marketplace" className="inline-block text-3xl mb-2 hover:scale-105 transition-transform">🌱</Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Listing</h1>
          <p className="text-slate-500 text-sm mt-1">Share an offering, request, or commercial storefront with your church community.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Listing Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleTypeChange}
                className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
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
                className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                <option value="" disabled>-- Select Category --</option>
                <option value="GOODS">Goods & Produce</option>
                <option value="SKILLS">Skills & Tutoring</option>
                <option value="RIDES">Transportation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Title *</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Fresh Organic Tomatoes / Math Tutoring..."
            />
          </div>

          {/* Amount field: Hidden for Commercial */}
          {formData.type !== 'COMMERCIAL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Amount *</label>
              <input
                type="number"
                step="0.01"
                name="priceInBucks"
                required
                value={formData.priceInBucks}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          )}

          {/* Commercial fields: Location (Google Autocomplete) & Business Hours */}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Description *</label>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Provide details about your offering or request..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Listing Image (Optional)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl text-slate-400">📷</span>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">PNG, JPG or WEBP (Max 5MB)</p>
              </div>
            </div>
            {uploadingImage && <p className="text-xs text-emerald-600 mt-1">Processing image...</p>}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Link href="/marketplace" className="text-xs font-semibold text-slate-500 hover:text-slate-700">
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading || uploadingImage || error.includes('already allowed')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}