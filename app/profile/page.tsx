// app/profile/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FavoriteButton from '@/components/FavoriteButton';

function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '').substring(0, 10);
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  if (!match) return value;
  if (!match[2]) return match[1] ? `(${match[1]}` : '';
  if (!match[3]) return `(${match[1]}) ${match[2]}`;
  return `(${match[1]}) ${match[2]}-${match[3]}`;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profileData, setProfileData] = useState<any>(null);
  const [userListings, setUserListings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [visibleTransactionsCount, setVisibleTransactionsCount] = useState(10);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    userPhone: '',
    address: '',
    latitude: '',
    longitude: '',
    city: '',
    state: 'FL',
    churchName: '',
    bio: '',
    avatar: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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

  // Initialize Google Places Autocomplete strictly
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
        setIsAddressValid(true);
        setError('');
      } else {
        setIsAddressValid(false);
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
      const currentFavorites = profileJson.favorites || [];

      setProfileData(currentUser);
      setUserListings(currentListings);
      setFavorites(currentFavorites);
      setTaxonomy(Array.isArray(taxonomyData) ? taxonomyData : []);
      
      const userCity = currentUser.city || '';
      const userState = currentUser.state || 'FL';
      const userChurch = currentUser.churchName || '';

      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        userPhone: currentUser.userPhone || '',
        address: currentUser.address || '',
        latitude: currentUser.latitude !== null && currentUser.latitude !== undefined ? String(currentUser.latitude) : '',
        longitude: currentUser.longitude !== null && currentUser.longitude !== undefined ? String(currentUser.longitude) : '',
        city: userCity,
        state: userState,
        churchName: userChurch,
        bio: currentUser.bio || '',
        avatar: currentUser.avatar || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      if (currentUser.address && currentUser.latitude) {
        setIsAddressValid(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'userPhone') {
      setFormData((prev) => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (name === 'address') {
      setIsAddressValid(false);
      setFormData((prev) => ({ ...prev, latitude: '', longitude: '' }));
    }
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

    if (formData.userPhone && formData.userPhone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    if (!formData.city.trim()) {
      setError('Please select a city and state.');
      return;
    }

    if (!formData.bio.trim()) {
      setError('Please fill out the Description / Bio field.');
      return;
    }

    if (!isAddressValid || !formData.latitude || !formData.longitude) {
      setError('Please select your valid street address from the Google Maps dropdown suggestions.');
      addressInputRef.current?.focus();
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

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
    return <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium text-sm">Loading profile...</div>;
  }

  const rawTransactions = profileData ? [
    ...(profileData.sentTx || []),
    ...(profileData.receivedTx || [])
  ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  const allTransactions = Array.from(
    new Map(rawTransactions.map((tx: any) => [tx.id, tx])).values()
  );

  const displayedTransactions = allTransactions.slice(0, visibleTransactionsCount);
  const hasMoreTransactions = visibleTransactionsCount < allTransactions.length;

  const displayCity = profileData?.city || profileData?.user?.city || 'City not set';
  const displayState = profileData?.state || profileData?.user?.state || 'FL';
  const displayChurch = profileData?.churchName || profileData?.user?.churchName;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <main className="w-full pt-1 space-y-4 px-[10px] sm:px-6 max-w-5xl mx-auto">
        
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-500">
              My Profile
            </h1>
            <h2 className="text-sm sm:text-base font-medium text-gray-500">
              Manage your personal information and active listings
            </h2>
          </div>

          <Link
            href="#wallet"
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all shadow-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800"
            title="Jump to wallet"
          >
            <span>🌱</span>
            <span>GB {Number(profileData?.growbucks || 0).toFixed(2)}</span>
          </Link>
        </div>

        {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">{error}</div>}
        {successMessage && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">{successMessage}</div>}

        <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-2xl">
          {!isEditing ? (
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-40 h-40 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 rounded-2xl shadow-inner">
                  {profileData?.avatar ? (
                    <img src={profileData.avatar} alt={profileData?.name || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">👤</span>
                  )}
                </div>

                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{profileData?.name || 'Community Member'}</h1>
                  <p className="text-slate-500 text-xs font-medium">{profileData?.email || session?.user?.email}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 rounded-md">
                      📍 {displayCity}, {displayState}
                    </span>
                    {displayChurch && (
                      <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 rounded-md">
                        ⛪ {displayChurch}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="userPhone"
                  required
                  maxLength={14}
                  value={formData.userPhone}
                  onChange={handleInputChange}
                  placeholder="(555) 000-0000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <p className="text-[11px] text-slate-500 mt-1 font-medium">Your phone is not displayed to the public.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Street Address / Location (Google Maps) *</label>
                <input
                  ref={addressInputRef}
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Start typing and select from the dropdown..."
                  required
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    isAddressValid ? 'border-emerald-400 focus:ring-emerald-400 bg-emerald-50/20' : 'border-slate-200 focus:ring-emerald-400'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[11px] text-slate-500 font-medium">For searching listings by mileage, this is not public</p>
                  <p className={`text-[11px] font-bold ${isAddressValid ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {isAddressValid ? '✓ Google Address Verified' : '⚠ Must select from dropdown'}
                  </p>
                </div>
              </div>

              <input type="hidden" name="latitude" value={formData.latitude} />
              <input type="hidden" name="longitude" value={formData.longitude} />

              <div className="p-4 border border-slate-200 rounded-xl space-y-4 bg-slate-50/50">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Church Community (City &gt; Church)</span>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">City, State *</label>
                  {!isAddingCity ? (
                    <div className="flex gap-2">
                      <select
                        value={formData.city ? `${formData.city}|${formData.state}` : ''}
                        onChange={handleCitySelect}
                        required
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Church Affiliation (Optional)</label>
                  {!isAddingChurch ? (
                    <div className="flex gap-2">
                      <select
                        name="churchName"
                        value={formData.churchName}
                        onChange={handleInputChange}
                        disabled={!formData.city}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-slate-100 cursor-pointer"
                      >
                        <option value="">{formData.city ? 'Select Church (Optional)' : 'Select a City first'}</option>
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

              <div className="p-4 border border-slate-200 rounded-xl space-y-4 bg-slate-50/50">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Change Password (Optional)</span>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Current Password</label>
                  <input 
                    type="password" 
                    name="currentPassword" 
                    value={formData.currentPassword} 
                    onChange={handleInputChange} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" 
                    placeholder="Enter current password to change"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">New Password</label>
                    <input 
                      type="password" 
                      name="newPassword" 
                      value={formData.newPassword} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" 
                      placeholder="New password"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      value={formData.confirmPassword} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" 
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Profile Photo (Upload from Device - Optional)</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 rounded-xl shadow-inner">
                    {formData.avatar ? <img src={formData.avatar} alt="Avatar Preview" className="w-full h-full object-cover" /> : <span className="text-4xl">👤</span>}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploadingImage} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                    {uploadingImage && <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Processing image...</span>}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description / Bio *</label>
                <textarea 
                  name="bio" 
                  rows={3} 
                  required 
                  value={formData.bio} 
                  onChange={handleInputChange} 
                  placeholder="Tell us a little bit about yourself..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" 
                />
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

        {/* Saved Favorites Section */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Saved Favorites ({favorites.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Listings and users you have bookmarked for quick access.</p>
            </div>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              You haven't favorited any listings or users yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favItem: any) => {
                const targetUser = favItem.targetUser || favItem.user;
                if (targetUser) {
                  return (
                    <div key={favItem.id} className="border border-slate-200 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all rounded-xl overflow-hidden group relative">
                      <div className="absolute top-3 right-3 z-10">
                        <FavoriteButton userId={targetUser.id} initialIsFavorited={true} />
                      </div>
                      <Link href={`/profile/${targetUser.id}`} className="block p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center overflow-hidden shrink-0">
                            {targetUser.avatar ? (
                              <img src={targetUser.avatar} alt={targetUser.name} className="w-full h-full object-cover" />
                            ) : (
                              targetUser.name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                              {targetUser.name}
                            </h3>
                            <p className="text-[11px] text-slate-500">📍 {targetUser.city || 'Bradenton'}, {targetUser.state || 'FL'}</p>
                          </div>
                        </div>
                        <p className="text-slate-600 text-xs line-clamp-2">
                          {targetUser.bio || 'Community member profile.'}
                        </p>
                      </Link>
                      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                        Saved User Profile
                      </div>
                    </div>
                  );
                }

                const listing = favItem.listing;
                if (!listing || !listing.id) return null;
                
                const createdDate = new Date(listing.createdAt || Date.now());
                const expirationDate = new Date(createdDate);
                expirationDate.setDate(expirationDate.getDate() + 14);
                const isCommercial = (listing.type || '').toUpperCase() === 'COMMERCIAL';
                const priceDisplay = !isCommercial ? `GB ${Number(listing.priceInBucks || 0).toFixed(2)}` : 'Storefront';

                return (
                  <div key={listing.id} className="border border-slate-200 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all rounded-xl overflow-hidden group relative">
                    <div className="absolute top-3 right-3 z-10">
                      <FavoriteButton listingId={listing.id} initialIsFavorited={true} />
                    </div>

                    <Link href={`/listings/${listing.id}`} className="block">
                      <div className="h-52 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        <img 
                          src={listing.imageUrl || listing.image || 'https://placehold.co/600x400/f1f5f9/64748b?text=No+Image+Available'} 
                          alt={listing.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <span className={`absolute top-3 left-3 px-3 py-1 rounded text-xs font-normal uppercase tracking-wide border shadow-sm ${
                          isCommercial ? 'bg-sky-100 text-blue-800 border-sky-300' : 'bg-slate-100 text-black border-slate-200'
                        }`}>
                          {listing.type}
                        </span>
                      </div>

                      <div className="p-5 pb-2">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 leading-snug transition-colors">
                          {listing.title}
                        </h3>
                      </div>

                      <div className="p-5 pt-2">
                        <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed font-normal mb-3">
                          {listing.description}
                        </p>
                      </div>
                    </Link>

                    <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{priceDisplay}</span>
                      <span className="font-normal text-[11px] text-slate-500">
                        Expires: {expirationDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
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
                
                const itemCity = item.city || displayCity;
                const itemChurch = item.churchName || displayChurch || 'Grace Family Church';
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
                          <span>⛪</span>
                          <span>{itemCity} &gt; {itemChurch}</span>
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

        {/* GrowBucks Wallet & Transaction History Card */}
        <div id="wallet" className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-2xl space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-slate-900">GrowBucks Wallet</h2>
              <p className="text-xs text-slate-500">Your available balance and transfer transaction ledger</p>
            </div>
            <span className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-base rounded-2xl">
              GB {Number(profileData?.growbucks || 0).toFixed(2)}
            </span>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Transaction History ({allTransactions.length})</h3>
            {allTransactions.length === 0 ? (
              <p className="text-xs text-slate-400">No Growbucks transactions yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  {displayedTransactions.map((tx: any) => {
                    const isSelfTransfer = tx.senderId === tx.receiverId;
  const isSender = isSelfTransfer ? false : (tx.senderId === profileData?.id);
  const isOutflow = isSender || Number(tx.amount) < 0;
  const absAmount = Math.abs(Number(tx.amount) || 0).toFixed(2);

  return (
    <div key={tx.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 text-sm">{tx.reason}</span>
          <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${
            tx.type === 'Trade' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            tx.type === 'Referral' ? 'bg-purple-50 text-purple-700 border-purple-200' :
            tx.type === 'Activity' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {tx.type || 'Trade'}
          </span>
        </div>
        <span className="text-slate-500 font-medium block">
          {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {isSender ? `Sent to ${tx.receiver?.name || 'Member'}` : `Received from ${tx.sender?.name || 'Member'}`}
        </span>
      </div>
      <div className="text-right">
        <span className={`font-black text-sm block ${isOutflow ? 'text-rose-600' : 'text-emerald-600'}`}>
          {isOutflow ? `-${absAmount}` : `+${absAmount}`} GB
        </span>
        {tx.commission !== null && tx.commission !== undefined && (
          <span className="text-[10px] text-slate-400 font-medium block">
            Commission: GB {Number(tx.commission).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasMoreTransactions && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setVisibleTransactionsCount(prev => prev + 10)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer border border-slate-200"
                    >
                      Load Another 10 Transactions ({allTransactions.length - visibleTransactionsCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}