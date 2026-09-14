'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const libraries: ('places')[] = ['places'];

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params?.id as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceInBucks, setPriceInBucks] = useState('0.00');
  const [type, setType] = useState('OFFER');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [businessHours, setBusinessHours] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    if (!listingId) return;

    async function loadData() {
      try {
        const userRes = await fetch('/api/user/me');
        if (!userRes.ok) throw new Error('Not logged in');
        const userData = await userRes.json();
        setCurrentUser(userData);

        const listingRes = await fetch(`/api/listings/${listingId}`);
        if (!listingRes.ok) throw new Error('Listing not found');
        const listingData = await listingRes.json();

        if (listingData.authorId !== userData.id) {
          setError('You do not have permission to edit this listing.');
          setLoading(false);
          return;
        }

        setTitle(listingData.title || '');
        setDescription(listingData.description || '');
        setPriceInBucks(String(listingData.priceInBucks || '0.00'));
        setType(listingData.type || 'OFFER');
        setImageUrl(listingData.imageUrl || '');
        setVideoUrl(listingData.videoUrl || '');
        setWebsiteUrl(listingData.websiteUrl || '');
        setAddress(listingData.address || '');
        setLatitude(listingData.latitude != null ? String(listingData.latitude) : '');
        setLongitude(listingData.longitude != null ? String(listingData.longitude) : '');
        setBusinessHours(listingData.businessHours || '');
      } catch (err: any) {
        setError(err.message || 'Failed to load listing details.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [listingId]);

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
    if (!currentUser?.id) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priceInBucks,
          imageUrl,
          videoUrl,
          websiteUrl,
          address,
          latitude,
          longitude,
          businessHours,
          userId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update listing');

      router.push('/marketplace');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading listing editor...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 my-8 bg-white border rounded-xl shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
          <p className="text-sm text-gray-500">Update your offering details or upload a new photo.</p>
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
        <div>
          <label htmlFor="edit-title" className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
          <input
            id="edit-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-sm border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="edit-price" className="block text-sm font-semibold text-gray-700 mb-1">Price (Growbucks)</label>
          <input
            id="edit-price"
            type="number"
            step="0.01"
            min="0"
            required
            value={priceInBucks}
            onChange={(e) => setPriceInBucks(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-sm border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="edit-description" className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
          <textarea
            id="edit-description"
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-sm border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Direct Image File Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Listing Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            disabled={uploadingImage}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border rounded-lg p-1"
          />
          {uploadingImage && <p className="text-xs text-emerald-600 mt-1">Uploading new image...</p>}
          {imageUrl && !uploadingImage && (
            <div className="mt-2 flex items-center gap-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <img src={imageUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
              <span className="text-xs text-emerald-800 font-medium">Current image attached</span>
            </div>
          )}
        </div>

        {/* Commercial Specific Fields */}
        {type === 'COMMERCIAL' && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
            <h3 className="text-sm font-bold text-purple-900 border-b border-purple-200 pb-2">Business Location & Details</h3>

            <div>
              <label htmlFor="edit-business-address" className="block text-xs font-bold text-purple-900 mb-1">
                Commercial Address
              </label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                  onPlaceChanged={onPlaceChanged}
                >
                  <input
                    id="edit-business-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg text-sm border-purple-300 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  />
                </Autocomplete>
              ) : (
                <input
                  type="text"
                  disabled
                  value={address}
                  className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-100"
                />
              )}
            </div>

            <div>
              <label htmlFor="edit-business-hours" className="block text-xs font-bold text-purple-900 mb-1">
                Business Hours
              </label>
              <input
                id="edit-business-hours"
                type="text"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm border-purple-300 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
              />
            </div>

            <div>
              <label htmlFor="edit-website-url" className="block text-xs font-bold text-purple-900 mb-1">
                Business Website URL
              </label>
              <input
                id="edit-website-url"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm border-purple-300 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
              />
            </div>

            <div>
              <label htmlFor="edit-video-url" className="block text-xs font-bold text-purple-900 mb-1">
                Commercial Video URL
              </label>
              <input
                id="edit-video-url"
                type="url"
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
          {submitting ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}