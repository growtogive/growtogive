'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function EditProfilePage() {
  const { status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    latitude: '',
    longitude: '',
    city: '',
    state: '',
    churchName: '',
    bio: '',
    avatar: '',
  });

  const [taxonomy, setTaxonomy] = useState<any[]>([]);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('FL');

  const [isAddingChurch, setIsAddingChurch] = useState(false);
  const [newChurch, setNewChurch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const addressInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Profile & Taxonomies
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      Promise.all([
        fetch('/api/profile').then((res) => res.json()),
        fetch('/api/taxonomies').then((res) => res.json()),
      ])
        .then(([profileData, taxonomyData]) => {
          setFormData({
            name: profileData.name || '',
            email: profileData.email || '',
            address: profileData.address || '',
            latitude: profileData.latitude !== null ? String(profileData.latitude) : '',
            longitude: profileData.longitude !== null ? String(profileData.longitude) : '',
            city: profileData.city || '',
            state: profileData.state || 'FL',
            churchName: profileData.churchName || '',
            bio: profileData.bio || '',
            avatar: profileData.avatar || '',
          });
          setTaxonomy(taxonomyData);
          setLoading(false);
        })
        .catch(() => {
          setMessage({ type: 'error', text: 'Failed to load profile data.' });
          setLoading(false);
        });
    }
  }, [status, router]);

  // 2. Initialize Google Places Autocomplete for Address -> Hidden Lat/Lng
  useEffect(() => {
    if (window.google && addressInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const formattedAddress = place.formatted_address || '';

          setFormData((prev) => ({
            ...prev,
            address: formattedAddress,
            latitude: String(lat),
            longitude: String(lng),
          }));
        }
      });
    }
  }, [loading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    if (!selectedVal) {
      setFormData({ ...formData, city: '', state: '', churchName: '' });
      return;
    }
    const [cityName, stateName] = selectedVal.split('|');
    setFormData({ ...formData, city: cityName, state: stateName, churchName: '' });
  };

  const handleSaveNewCity = () => {
    if (!newCity) return;
    setFormData({ ...formData, city: newCity, state: newState, churchName: '' });
    setTaxonomy([...taxonomy, { city: newCity, state: newState, churches: [] }]);
    setNewCity('');
    setIsAddingCity(false);
  };

  const handleSaveNewChurch = () => {
    if (!newChurch) return;
    setFormData({ ...formData, churchName: newChurch });
    setTaxonomy(
      taxonomy.map((t) => (t.city === formData.city ? { ...t, churches: [...t.churches, newChurch] } : t))
    );
    setNewChurch('');
    setIsAddingChurch(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => router.push('/profile'), 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const currentCityTaxonomy = taxonomy.find((t) => t.city === formData.city);
  const availableChurches = currentCityTaxonomy ? currentCityTaxonomy.churches : [];

  if (loading) {
    return <div className="flex justify-center items-center min-h-[50vh]">Loading profile...</div>;
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border mb-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Edit Profile & Location</h1>

      {message.text && (
        <div className={`p-3 mb-4 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full border rounded-md p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full border rounded-md p-2" />
        </div>

        {/* Google Address Lookup (Auto-fills hidden Lat/Lng) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Street Address (Google Maps)</label>
          <input
            type="text"
            name="address"
            ref={addressInputRef}
            value={formData.address}
            onChange={handleChange}
            placeholder="Type your address to capture location..."
            className="mt-1 block w-full border rounded-md p-2"
          />
        </div>

        {/* Hidden Latitude & Longitude Fields */}
        <input type="hidden" name="latitude" value={formData.latitude} />
        <input type="hidden" name="longitude" value={formData.longitude} />

        {/* City & State Dropdown + Add New */}
        <div>
          <label className="block text-sm font-medium text-gray-700">City, State</label>
          {!isAddingCity ? (
            <div className="flex gap-2">
              <select
                value={formData.city ? `${formData.city}|${formData.state}` : ''}
                onChange={handleCitySelect}
                className="mt-1 block w-full border rounded-md p-2"
              >
                <option value="">Select City, State</option>
                {taxonomy.map((item) => (
                  <option key={`${item.city}|${item.state}`} value={`${item.city}|${item.state}`}>
                    {item.city}, {item.state}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setIsAddingCity(true)} className="mt-1 px-3 bg-gray-200 text-xs rounded hover:bg-gray-300">
                + Add City
              </button>
            </div>
          ) : (
            <div className="mt-1 p-3 bg-gray-50 border rounded-md space-y-2">
              <div className="flex gap-2">
                <input type="text" placeholder="City Name" value={newCity} onChange={(e) => setNewCity(e.target.value)} className="border p-1 rounded w-full" />
                <input type="text" placeholder="State (FL)" value={newState} onChange={(e) => setNewState(e.target.value)} className="border p-1 rounded w-20" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleSaveNewCity} className="bg-blue-600 text-white px-3 py-1 text-sm rounded">Use City</button>
                <button type="button" onClick={() => setIsAddingCity(false)} className="text-gray-500 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Church Dropdown (Dependent on City) + Add New */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Church Name</label>
          {!isAddingChurch ? (
            <div className="flex gap-2">
              <select
                name="churchName"
                value={formData.churchName}
                onChange={handleChange}
                disabled={!formData.city}
                className="mt-1 block w-full border rounded-md p-2 disabled:bg-gray-100"
              >
                <option value="">{formData.city ? 'Select Church' : 'Select a City first'}</option>
                {availableChurches.map((churchName: string) => (
                  <option key={churchName} value={churchName}>
                    {churchName}
                  </option>
                ))}
              </select>
              <button type="button" disabled={!formData.city} onClick={() => setIsAddingChurch(true)} className="mt-1 px-3 bg-gray-200 text-xs rounded hover:bg-gray-300 disabled:opacity-50">
                + Add Church
              </button>
            </div>
          ) : (
            <div className="mt-1 p-3 bg-gray-50 border rounded-md space-y-2">
              <input type="text" placeholder="Church Name" value={newChurch} onChange={(e) => setNewChurch(e.target.value)} className="border p-1 rounded w-full" />
              <div className="flex gap-2">
                <button type="button" onClick={handleSaveNewChurch} className="bg-blue-600 text-white px-3 py-1 text-sm rounded">Use Church</button>
                <button type="button" onClick={() => setIsAddingChurch(false)} className="text-gray-500 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Avatar Image URL</label>
          <input type="text" name="avatar" value={formData.avatar} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description / Bio</label>
          <textarea name="bio" rows={4} value={formData.bio} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
        </div>

        <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 transition">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}