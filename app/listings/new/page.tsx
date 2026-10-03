'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
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

export default function NewListingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const basicTrainingPassed = (session?.user as any)?.basicTrainingPassed;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'OFFER',
    category: '',
    priceInBucks: '0.00',
    imageUrl: '',
    images: [] as string[],
    isFeatured: false,
    location: '',
    businessHours: '',
    latitude: 27.4989,
    longitude: -82.5648,
  });

  const [hasOtherCommercial, setHasOtherCommercial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');

  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ONLY Featured listings get up to 5 images. All other listings get 1.
  const allowsMultipleImages = formData.isFeatured;
  const maxImagesAllowed = allowsMultipleImages ? 5 : 1;

  useEffect(() => {
    checkCommercialStatus();
  }, []);

  useEffect(() => {
    if (formData.type !== 'COMMERCIAL') return;

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
  }, [formData.type]);

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

  const checkCommercialStatus = async () => {
    try {
      const res = await fetch('/api/listings');
      if (res.ok) {
        const listings = await res.json();
        const hasCommercial = listings.some((l: any) => l.type === 'COMMERCIAL' && l.isUserAuthor);
        setHasOtherCommercial(hasCommercial);
      }
    } catch (err) {
      console.error('Failed to check commercial listings', err);
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setError('');

    if (newType === 'COMMERCIAL' && hasOtherCommercial) {
      setError('⚠️ You are allowed only one active commercial listing.');
    }

    setFormData((prev) => {
      const updatedImages = (!prev.isFeatured && prev.images.length > 1) 
        ? [prev.images[0]] 
        : prev.images;
      return {
        ...prev,
        type: newType,
        images: updatedImages,
        imageUrl: updatedImages[0] || '',
      };
    });
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const limit = allowsMultipleImages ? 5 : 1;
    if (formData.images.length + files.length > limit) {
      setError(allowsMultipleImages ? 'Featured listings allow a maximum of 5 images.' : 'Standard listings allow only 1 image. Upgrade to Featured to unlock up to 5 images.');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const newImagePromises = Array.from(files).map((file) => {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Image file is too large. Please select images under 5MB.');
        }
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const base64Images = await Promise.all(newImagePromises);
      
      setFormData((prev) => {
        const updatedImages = allowsMultipleImages 
          ? [...prev.images, ...base64Images].slice(0, 5)
          : [base64Images[0]];
        return {
          ...prev,
          images: updatedImages,
          imageUrl: updatedImages[0] || '',
        };
      });
    } catch (err: any) {
      setError(err.message || 'Error processing uploaded image(s).');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData((prev) => {
      const updatedImages = prev.images.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: updatedImages,
        imageUrl: updatedImages[0] || '',
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.type === 'COMMERCIAL' && hasOtherCommercial) {
      setError('⚠️ Action blocked: You already have an active commercial listing.');
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

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          title: formattedTitle,
          priceInBucks: formData.type === 'COMMERCIAL' ? 0 : (parseFloat(formData.priceInBucks) || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create listing.');

      router.push(`/listings/${data.listing?.id || data.id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  // --- BASIC TRAINING GATE CHECK SCREEN ---
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">Loading...</div>;
  }

  if (session && !basicTrainingPassed) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">🔒</div>
          <h1 className="text-xl font-bold text-slate-900">Basic Training Required</h1>
          <p className="text-slate-600 text-xs leading-relaxed">
            You must complete and pass <span className="font-semibold text-slate-900">Basic Training</span> before you can create marketplace listings or trade Growbucks. You can still browse listings, join events, and take quizzes!
          </p>
          <div className="pt-4">
            <Link
              href="/basic-training"
              className="w-full inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded text-xs transition-all shadow-xs"
            >
              Start Basic Training Now
            </Link>
          </div>
          <div className="pt-2">
            <Link href="/marketplace" className="text-xs text-slate-500 hover:underline">
              Return to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm p-8 sm:p-10">
        
        <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Listing</h1>
            <p className="text-slate-500 text-xs mt-0.5">Post an offer, request, or commercial storefront.</p>
          </div>
          <Link href="/marketplace" className="text-xs font-semibold text-slate-500 hover:text-slate-900">
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
              placeholder="e.g. Fresh Garden Tomatoes or Looking for Lawn Mower"
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
                <option value="" disabled>Select category...</option>
                {LISTING_CATEGORIES.map((catName) => (
                  <option key={catName} value={catName}>{catName}</option>
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
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Storefront Location / Address *</label>
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
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Business Hours *</label>
                <input
                  type="text"
                  name="businessHours"
                  required
                  value={formData.businessHours}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="e.g. Mon-Fri 9am - 5pm"
                />
              </div>
            </div>
          )}

          {/* Media Upload Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Listing Images {allowsMultipleImages ? '(Up to 5 images allowed)' : '(1 image allowed - upgrade to Featured for 5)'}
            </label>

            <div className={`grid gap-3 mb-3 ${allowsMultipleImages ? 'grid-cols-5' : 'grid-cols-1 max-w-xs'}`}>
              {formData.images.map((imgSrc, idx) => (
                <div key={idx} className="relative w-full h-20 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center rounded">
                  <img src={imgSrc} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}

              {formData.images.length < maxImagesAllowed && (
                <label className="w-full h-20 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded flex flex-col items-center justify-center cursor-pointer bg-slate-50 text-slate-500 text-[11px] font-medium">
                  <span>+ Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple={allowsMultipleImages}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {uploadingImage && <p className="text-xs text-emerald-600 mt-1">Processing image(s)...</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Description</label>
            <textarea
              name="description"
              rows={4}
              required
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide a detailed description..."
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              href="/marketplace"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating Listing...' : 'Publish Listing'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}