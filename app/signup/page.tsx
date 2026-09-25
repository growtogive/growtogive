'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Predefined City -> Church hierarchy options
const CHURCH_HIERARCHY: { [city: string]: string[] } = {
  'Bradenton': [
    'Grace Family Church',
    'Bayshore Baptist Church',
    'First Baptist Church of Bradenton',
    'Woodland Community Church'
  ],
  'Tampa': [
    'Idlewild Baptist Church',
    'Bayside Community Church - Tampa',
    'South Tampa Fellowship',
    'Corbett Prep Church Fellowship'
  ],
  'Sarasota': [
    'Church of the Palms',
    'Sarasota Baptist Church',
    'The Tabernacle Church',
    'South Shore Community Church'
  ],
  'Palmetto': [
    'Palmetto First Baptist Church',
    'North River Church',
    'Riverside Fellowship'
  ]
};

export default function SignupPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    city: 'Bradenton',
    state: 'FL',
    churchName: 'Grace Family Church',
    location: 'Bradenton, FL',
    latitude: 27.4989,
    longitude: -82.5648,
    bio: '',
    avatar: '', // Stores either URL or uploaded file string/base64
  });

  const [availableChurches, setAvailableChurches] = useState<string[]>(CHURCH_HIERARCHY['Bradenton']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load Google Maps script for location autocomplete
  useEffect(() => {
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
  }, []);

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
        let detectedState = formData.state;

        if (place.address_components) {
          for (const comp of place.address_components) {
            if (comp.types.includes('locality')) {
              detectedCity = comp.long_name;
            }
            if (comp.types.includes('administrative_area_level_1')) {
              detectedState = comp.short_name;
            }
          }
        }

        setFormData((prev) => ({
          ...prev,
          location: address,
          latitude: lat,
          longitude: lng,
          city: detectedCity,
          state: detectedState,
        }));
      }
    });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCity = e.target.value;
    const churches = CHURCH_HIERARCHY[selectedCity] || ['Community Fellowship'];
    setFormData((prev) => ({
      ...prev,
      city: selectedCity,
      churchName: churches[0],
      location: `${selectedCity}, ${prev.state}`
    }));
    setAvailableChurches(churches);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle image file upload from device
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Validate file size (e.g., under 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select an image under 5MB.');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Sets base64 string preview/storage value
        setFormData((prev) => ({ ...prev, avatar: reader.result as string }));
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
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong during registration.');
      }

      router.push('/login?registered=true');
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
          <Link href="/" className="inline-block text-3xl mb-2 hover:scale-105 transition-transform">🌱</Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Your GrowToGive Account</h1>
          <p className="text-slate-500 text-sm mt-1">Join your local church marketplace and community directory.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="••••••••"
            />
          </div>

          {/* Location with Google Maps Autocomplete */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Your Location (Address or City)
            </label>
            <input
              ref={inputRef}
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Start typing your address or neighborhood..."
            />
            <p className="text-[11px] text-slate-400 mt-1">Select from suggestions to lock in exact coordinates for Haversine radius searches.</p>
          </div>

          {/* Hidden Latitude & Longitude */}
          <input type="hidden" name="latitude" value={formData.latitude} />
          <input type="hidden" name="longitude" value={formData.longitude} />

          {/* City -> Church Hierarchy Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">City</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleCityChange}
                className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                {Object.keys(CHURCH_HIERARCHY).map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Church Affiliation</label>
              <select
                name="churchName"
                value={formData.churchName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                {availableChurches.map((churchName) => (
                  <option key={churchName} value={churchName}>
                    {churchName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Device Image Upload for Avatar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Profile Photo (Upload from Device)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">👤</span>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Bio / About You</label>
            <textarea
              name="bio"
              rows={4}
              value={formData.bio}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Share a little about yourself, your garden, or your skills..."
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Link href="/login" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Already have an account? Sign In
            </Link>

            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Complete Sign Up'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}