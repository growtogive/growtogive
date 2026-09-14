'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const libraries: ('places')[] = ['places'];

export default function CreateListingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceInBucks, setPriceInBucks] = useState('0.00');
  const [type, setType] = useState<'OFFER' | 'REQUEST' | 'COMMERCIAL'>('OFFER');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [businessHours, setBusinessHours] = useState('');

  // UI Feedback
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.error('Failed to load user:', err);
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUser();
  }, []);

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setAddress(place.formatted_address || '');
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
      }
    }
  };

  // Handle direct file upload from device
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload image');

      setImageUrl(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) {
      setError('You must be logged in to create a listing.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/listings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priceInBucks,
          type,
          imageUrl,
          videoUrl,
          websiteUrl,
          address,
          latitude,
          longitude,
          businessHours,
          authorId: currentUser.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish listing');
      }

      router.push('/marketplace');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return <div className="text-center py-12 text-gray-500">Loading author profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 my-8 bg-white border rounded-xl shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Post New Marketplace Listing</h1>
          <p className="text-sm text-gray-500">Share supplies, request help, or offer commercial goods.</p>
        </div>
        <Link href="/marketplace" className="text-xs text-emerald-600 hover:underline">
          &larr; Back to Marketplace
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Listing Type Radio Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Listing Type</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setType('OFFER')}
              className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 ${
                type === 'OFFER'
                  ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>🏷️ Offer</span>
              <span className="text-[10px] font-normal text-gray-500">Expires in 14 days</span>
            </button>

            <button
              type="button"
              onClick={() => setType('REQUEST')}
              className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 ${
                type === 'REQUEST'
                  ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>🙋 Request</span>
              <span className="text-[10px] font-normal text-gray-500">Expires in 14 days</span>
            </button>

            <button
              type="button"
              onClick={() => setType('COMMERCIAL')}
              className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 ${
                type === 'COMMERCIAL'
                  ? 'border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>🏢 Commercial</span>
              <span className="text-[10px] font-normal text-gray-500">Never Expires (Limit 1)</span>
            </button>
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label htmlFor="listing-title" className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
          <input
            id="listing-title"
            type="text"
            required
            placeholder="e.g. Fresh Honey, Garden Shovel, or Soil Supply"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-sm border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Price Input */}
        <div>
          <label htmlFor="price-input" className="block text-sm font-semibold text-gray-700 mb-1">Price (Growbucks)</label>
          <input
            id="price-input"
            type="number"
            step="0.01"
            min="0"
            required
            value={priceInBucks}
            onChange={(e) => setPriceInBucks(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-sm border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Description Textarea */}
        <div>
          <label htmlFor="listing-description" className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
          <textarea
            id="listing-description"
            rows={4}
            required
            placeholder="Describe the item or service in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-sm border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Direct Image File Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Listing Image (Optional)</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              disabled={uploadingImage}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border rounded-lg p-1"
            />
          </div>
          {uploadingImage && <p className="text-xs text-emerald-600 mt-1">Uploading image to server...</p>}
          {imageUrl && !uploadingImage && (
            <div className="mt-2 flex items-center gap-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <img src={imageUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
              <span className="text-xs text-emerald-800 font-medium">✓ Image uploaded successfully</span>
            </div>
          )}
        </div>

        {/* Commercial Specific Fields */}
        {type === 'COMMERCIAL' && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
            <h3 className="text-sm font-bold text-purple-900 border-b border-purple-200 pb-2">Business Location & Details</h3>

            <div>
              <label htmlFor="business-address" className="block text-xs font-bold text-purple-900 mb-1">
                Commercial Address (Google Autocomplete)
              </label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                  onPlaceChanged={onPlaceChanged}
                >
                  <input
                    id="business-address"
                    type="text"
                    placeholder="Search address or business name..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg text-sm border-purple-300 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  />
                </Autocomplete>
              ) : (
                <input
                  type="text"
                  disabled
                  placeholder="Loading Google Places..."
                  className="w-full px-4 py-2 border rounded-lg text-sm border-gray-200 bg-gray-100"
                />
              )}
            </div>

            {latitude && longitude && (
              <div className="p-2.5 bg-purple-100/70 border border-purple-200 rounded-lg text-xs text-purple-900 flex justify-between items-center">
                <span>📍 <strong>Autofilled Coordinates:</strong> {latitude}, {longitude}</span>
                <span className="text-[10px] text-purple-700 font-semibold">✓ Saved</span>
              </div>
            )}

            <div>
              <label htmlFor="business-hours" className="block text-xs font-bold text-purple-900 mb-1">
                Business Hours
              </label>
              <input
                id="business-hours"
                type="text"
                placeholder="Mon-Fri 9 AM - 5 PM, Sat 10 AM - 2 PM"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm border-purple-300 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
              />
            </div>

            <div>
              <label htmlFor="website-url-input" className="block text-xs font-bold text-purple-900 mb-1">
                Business Website URL
              </label>
              <input
                id="website-url-input"
                type="url"
                placeholder="https://www.yourbusiness.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm border-purple-300 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
              />
            </div>

            <div>
              <label htmlFor="video-url-input" className="block text-xs font-bold text-purple-900 mb-1">
                Commercial Video URL (YouTube / Vimeo)
              </label>
              <input
                id="video-url-input"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm border-purple-300 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || uploadingImage}
          className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Publishing Listing...' : 'Publish Listing'}
        </button>
      </form>
    </div>
  );
}