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
    state: 'FL',
    churchName: '',
    bio: '',
    avatar: '',
  });

  const [taxonomy, setTaxonomy] = useState<any[]>([]);
  
  // Toggle states for custom entries
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('FL');

  const [isAddingChurch, setIsAddingChurch] = useState(false);
  const [newChurch, setNewChurch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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
        .then(([profileResponse, taxonomyData]) => {
          const profileData = profileResponse.user || profileResponse;
          const userCity = profileData.city || '';
          const userState = profileData.state || 'FL';
          const userChurch = profileData.churchName || '';

          let loadedTaxonomies = Array.isArray(taxonomyData) ? taxonomyData : [];

          if (userCity && !loadedTaxonomies.some((t: any) => t.city.toLowerCase() === userCity.toLowerCase())) {
            loadedTaxonomies.push({ city: userCity, state: userState, churches: userChurch ? [userChurch] : [] });
          } else if (userCity && userChurch) {
            loadedTaxonomies = loadedTaxonomies.map((t: any) => {
              if (t.city.toLowerCase() === userCity.toLowerCase() && !t.churches.includes(userChurch)) {
                return { ...t, churches: [...t.churches, userChurch] };
              }
              return t;
            });
          }

          setFormData({
            name: profileData.name || '',
            email: profileData.email || '',
            address: profileData.address || '',
            latitude: profileData.latitude !== null && profileData.latitude !== undefined ? String(profileData.latitude) : '',
            longitude: profileData.longitude !== null && profileData.longitude !== undefined ? String(profileData.longitude) : '',
            city: userCity,
            state: userState,
            churchName: userChurch,
            bio: profileData.bio || '',
            avatar: profileData.avatar || '',
          });
          setTaxonomy(loadedTaxonomies);
          setLoading(false);
        })
        .catch(() => {
          setMessage({ type: 'error', text: 'Failed to load profile data.' });
          setLoading(false);
        });
    }
  }, [status, router]);

  // 2. Initialize Google Places Autocomplete strictly for Address, Lat, and Lng
  useEffect(() => {
    if (!loading && window.google && addressInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
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
      setFormData((prev) => ({ ...prev, city: '', state: 'FL', churchName: '' }));
      return;
    }
    const [cityName, stateName] = selectedVal.split('|');
    setFormData((prev) => ({ ...prev, city: cityName, state: stateName, churchName: '' }));
  };

  const handleSaveNewCity = () => {
    if (!newCity.trim()) return;
    const formattedCity = newCity.trim();
    const formattedState = newState.trim() || 'FL';

    const existingIndex = taxonomy.findIndex((t) => t.city.toLowerCase() === formattedCity.toLowerCase());
    if (existingIndex === -1) {
      setTaxonomy([...taxonomy, { city: formattedCity, state: formattedState, churches: [] }]);
    }

    setFormData((prev) => ({ ...prev, city: formattedCity, state: formattedState, churchName: '' }));
    setNewCity('');
    setIsAddingCity(false);
  };

  const handleSaveNewChurch = () => {
    if (!newChurch.trim()) return;
    const formattedChurch = newChurch.trim();

    setTaxonomy(
      taxonomy.map((t) => {
        if (t.city.toLowerCase() === formData.city.toLowerCase()) {
          const churchExists = t.churches.some((c: string) => c.toLowerCase() === formattedChurch.toLowerCase());
          return churchExists ? t : { ...t, churches: [...t.churches, formattedChurch] };
        }
        return t;
      })
    );

    setFormData((prev) => ({ ...prev, churchName: formattedChurch }));
    setNewChurch('');
    setIsAddingChurch(false);
  };

  // Device file upload handler for avatar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image file is too large. Please select an image under 5MB.' });
      return;
    }

    setUploadingImage(true);
    setMessage({ type: '', text: '' });

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, avatar: reader.result as string }));
        setUploadingImage(false);
      };
      reader.onerror = () => {
        setMessage({ type: 'error', text: 'Failed to read image file.' });
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error uploading image.' });
      setUploadingImage(false);
    }
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

      setMessage({ type: 'success', text: 'Profile updated successfully! Redirecting...' });
      
      // Force full page reload to ensure updated profile data renders properly
      setTimeout(() => {
        window.location.href = '/profile';
      }, 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setSaving(false);
    }
  };

  const currentCityTaxonomy = taxonomy.find((t) => t.city.toLowerCase() === (formData.city || '').toLowerCase());
  const availableChurches = currentCityTaxonomy ? currentCityTaxonomy.churches : [];

  if (loading) {
    return <div className="flex justify-center items-center min-h-[50vh] text-slate-500">Loading profile...</div>;
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 mb-10 text-slate-900">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <h1 className="text-xl font-bold">Edit Profile & Location</h1>
        <Link href="/profile" className="text-xs font-semibold text-slate-500 hover:text-slate-800">Cancel</Link>
      </div>

      {message.text && (
        <div className={`p-3 mb-4 rounded-xl text-xs font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Full Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Email Address</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>

        {/* Independent Street Address / Google Maps Lookup */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Street Address / Location (Google Maps)</label>
          <input
            type="text"
            name="address"
            ref={addressInputRef}
            value={formData.address}
            onChange={handleChange}
            placeholder="Type your address to capture location..."
            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <input type="hidden" name="latitude" value={formData.latitude} />
        <input type="hidden" name="longitude" value={formData.longitude} />

        {/* Border Wrapper for City > Church Hierarchy Section */}
        <div className="p-4 border border-slate-200 rounded-xl space-y-4 bg-slate-50/50">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Church Community (City &gt; Church)</span>

          {/* City & State Selection + Add New City Option */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">City, State</label>
            {!isAddingCity ? (
              <div className="flex gap-2">
                <select
                  value={formData.city ? `${formData.city}|${formData.state}` : ''}
                  onChange={handleCitySelect}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                >
                  <option value="">Select City, State</option>
                  {taxonomy.map((item) => (
                    <option key={`${item.city}|${item.state}`} value={`${item.city}|${item.state}`}>
                      {item.city}, {item.state}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setIsAddingCity(true)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl shrink-0 transition-colors">
                  + Add City
                </button>
              </div>
            ) : (
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex gap-2">
                  <input type="text" placeholder="New City Name" value={newCity} onChange={(e) => setNewCity(e.target.value)} className="border border-slate-200 p-2 rounded-xl text-sm w-full bg-white" />
                  <input type="text" placeholder="State (FL)" value={newState} onChange={(e) => setNewState(e.target.value)} className="border border-slate-200 p-2 rounded-xl text-sm w-20 bg-white" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={handleSaveNewCity} className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-semibold rounded-xl">Use City</button>
                  <button type="button" onClick={() => setIsAddingCity(false)} className="text-slate-500 text-xs font-semibold px-2">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Church Affiliation Selection + Add New Church Option */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Church Affiliation</label>
            {!isAddingChurch ? (
              <div className="flex gap-2">
                <select
                  name="churchName"
                  value={formData.churchName}
                  onChange={handleChange}
                  disabled={!formData.city}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-slate-100 cursor-pointer"
                >
                  <option value="">{formData.city ? 'Select Church' : 'Select a City first'}</option>
                  {availableChurches.map((churchName: string) => (
                    <option key={churchName} value={churchName}>
                      {churchName}
                    </option>
                  ))}
                </select>
                <button type="button" disabled={!formData.city} onClick={() => setIsAddingChurch(true)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl shrink-0 disabled:opacity-50 transition-colors">
                  + Add Church
                </button>
              </div>
            ) : (
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <input type="text" placeholder="New Church Name" value={newChurch} onChange={(e) => setNewChurch(e.target.value)} className="border border-slate-200 p-2 rounded-xl text-sm w-full bg-white" />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={handleSaveNewChurch} className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-semibold rounded-xl">Use Church</button>
                  <button type="button" onClick={() => setIsAddingChurch(false)} className="text-slate-500 text-xs font-semibold px-2">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Device Avatar Upload */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">Profile Photo (Upload from Device)</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 rounded-xl">
              {formData.avatar ? <img src={formData.avatar} alt="Avatar Preview" className="w-full h-full object-cover" /> : <span className="text-2xl">👤</span>}
            </div>
            <div className="flex-1">
              <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploadingImage} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
              {uploadingImage && <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Processing image...</span>}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Description / Bio</label>
          <textarea name="bio" rows={3} value={formData.bio} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving || uploadingImage} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl text-sm transition shadow-xs cursor-pointer disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}