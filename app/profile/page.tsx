'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profileData, setProfileData] = useState<any>(null);
  const [userListings, setUserListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
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
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('FL');

  const [isAddingChurch, setIsAddingChurch] = useState(false);
  const [newChurch, setNewChurch] = useState('');

  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchProfileAndTaxonomies();
    }
  }, [status]);

  // Initialize Google Places Autocomplete for independent street address lookup
  useEffect(() => {
    if (!isEditing || !window.google || !addressInputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || addressInputRef.current?.value || '';

        setFormData((prev) => ({
          ...prev,
          address: address,
          latitude: String(lat),
          longitude: String(lng),
        }));
      }
    });
  }, [isEditing]);

  const fetchProfileAndTaxonomies = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [profileRes, taxonomyRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/taxonomies'),
      ]);

      const profileJson = await profileRes.json();
      const taxonomyData = await taxonomyRes.json();
      
      if (!profileRes.ok) throw new Error(profileJson.error || 'Failed to load profile details.');
      
      const currentUser = profileJson.user || profileJson;
      const currentListings = profileJson.listings || [];

      setProfileData(currentUser);
      setUserListings(currentListings);
      setTaxonomy(Array.isArray(taxonomyData) ? taxonomyData : []);
      
      const userCity = currentUser.city || '';
      const userState = currentUser.state || 'FL';
      const userChurch = currentUser.churchName || '';

      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        address: currentUser.address || '',
        latitude: currentUser.latitude !== null && currentUser.latitude !== undefined ? String(currentUser.latitude) : '',
        longitude: currentUser.longitude !== null && currentUser.longitude !== undefined ? String(currentUser.longitude) : '',
        city: userCity,
        state: userState,
        churchName: userChurch,
        bio: currentUser.bio || '',
        avatar: currentUser.avatar || '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');

      setProfileData(data.user || data);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      
      // Clean hard reload to ensure data freshness across components
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete listing.');
      setUserListings(userListings.filter((item) => item.id !== listingId));
      setSuccessMessage('Listing deleted successfully.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const currentCityTaxonomy = taxonomy.find((t) => t.city.toLowerCase() === (formData.city || '').toLowerCase());
  const availableChurches = currentCityTaxonomy ? currentCityTaxonomy.churches : [];

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium text-sm">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">{error}</div>}
        {successMessage && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">{successMessage}</div>}

        {/* Profile Card Header (Inline Dropdown Edit Form) */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 mb-8 rounded-2xl">
          {!isEditing ? (
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 rounded-xl">
                  {profileData?.avatar ? (
                    <img src={profileData.avatar} alt={profileData?.name || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">👤</span>
                  )}
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{profileData?.name || 'Community Member'}</h1>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">{profileData?.email || session?.user?.email}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 rounded-md">
                      📍 {profileData?.city || 'City not set'}, {profileData?.state || 'FL'}
                    </span>
                    <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 rounded-md">
                      ⛪ {profileData?.churchName || 'Church not set'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="bg-amber-50 border border-amber-200 px-4 py-2 text-center rounded-xl">
                  <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">Growbucks</span>
                  <span className="text-lg font-bold text-amber-900">GB {profileData?.growbucks?.toFixed(2) ?? '10.00'}</span>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs rounded-xl cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Edit Your Profile</h2>
                <button type="button" onClick={() => setIsEditing(false)} className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer">
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Street Address (Google Maps)</label>
                <input ref={addressInputRef} type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Start typing your address..." />
              </div>

              <input type="hidden" name="latitude" value={formData.latitude} />
              <input type="hidden" name="longitude" value={formData.longitude} />

              {/* Border Wrapper for City > Church Hierarchy Section */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-4 bg-slate-50/50">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Church Community (City &gt; Church)</span>

                {/* City Selection + Add New City */}
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

                {/* Church Affiliation Selection + Add New Church */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Church Affiliation</label>
                  {!isAddingChurch ? (
                    <div className="flex gap-2">
                      <select
                        name="churchName"
                        value={formData.churchName}
                        onChange={handleInputChange}
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
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Profile Photo (Upload from Device)</label>
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
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Bio / About You</label>
                <textarea name="bio" rows={3} value={formData.bio} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="submit" disabled={uploadingImage} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 rounded-xl">
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {!isEditing && profileData?.bio && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{profileData.bio}</p>
            </div>
          )}
        </div>

        {/* User's Marketplace Listings Section */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Marketplace Listings</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage the items and services you have posted to the community.</p>
            </div>

            <Link href="/listings/new" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition-all rounded-xl">
              + Create New Listing
            </Link>
          </div>

          {userListings.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-medium">You haven't created any listings yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userListings.map((item: any) => {
                const createdDate = new Date(item.createdAt);
                const expirationDate = new Date(createdDate);
                expirationDate.setDate(expirationDate.getDate() + 14);
                const isCommercial = (item.type || '').toUpperCase() === 'COMMERCIAL';
                
                const displayCity = (item.city || profileData?.city || '').trim() || 'General City';
                const displayChurch = (item.churchName || profileData?.churchName || '').trim() || 'Grace Family Church';
                const dateDisplay = isCommercial ? `Created: ${createdDate.toLocaleDateString()}` : `Expires: ${expirationDate.toLocaleDateString()}`;

                return (
                  <div key={item.id} className="border border-slate-200 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all rounded-xl overflow-hidden group">
                    <Link href={`/listings/${item.id}`} className="block">
                      <div className="h-52 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        <img 
                          src={item.imageUrl || 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          onError={(e: any) => { 
                            e.target.src = 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'; 
                          }}
                        />
                        <span className={`absolute top-3 right-3 px-3 py-1 rounded text-xs font-normal uppercase tracking-wide border shadow-sm ${
                          isCommercial ? 'bg-sky-100 text-blue-800 border-sky-300' : 'bg-slate-100 text-black border-slate-200'
                        }`}>
                          {item.type}
                        </span>
                      </div>

                      <div className="p-5 pb-2">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 leading-snug transition-colors">
                          {item.title}
                        </h3>
                        <div className="mt-1.5 text-xs font-medium text-slate-500 flex items-center gap-1.5">
                          <span>✝️</span>
                          <span>{displayCity} &gt; {displayChurch}</span>
                        </div>
                      </div>

                      <div className="p-5 pt-2">
                        <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed font-normal mb-3">
                          {item.description}
                        </p>
                      </div>
                    </Link>

                    <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{!isCommercial ? `GB ${Number(item.priceInBucks || 0).toFixed(2)}` : 'Storefront'}</span>
                      <span className="font-normal text-[11px] text-slate-500">
                        {dateDisplay}
                      </span>
                    </div>

                    <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {isCommercial ? 'Commercial' : (Number(item.priceInBucks) > 0 ? `GB ${Number(item.priceInBucks).toFixed(2)}` : 'Free')}
                      </span>

                      <div className="flex items-center gap-2">
                        <Link href={`/listings/${item.id}/edit`} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg">
                          Edit
                        </Link>
                        <button onClick={() => handleDeleteListing(item.id)} className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium rounded-lg cursor-pointer">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}