'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CHURCH_HIERARCHY: { [city: string]: string[] } = {
  'Bradenton': ['Grace Family Church', 'Bayshore Baptist Church', 'First Baptist Church of Bradenton', 'Woodland Community Church'],
  'Tampa': ['Idlewild Baptist Church', 'Bayside Community Church - Tampa', 'South Tampa Fellowship', 'Corbett Prep Church Fellowship'],
  'Sarasota': ['Church of the Palms', 'Sarasota Baptist Church', 'The Tabernacle Church', 'South Shore Community Church'],
  'Palmetto': ['Palmetto First Baptist Church', 'North River Church', 'Riverside Fellowship']
};

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
    city: 'Bradenton',
    state: 'FL',
    churchName: 'Grace Family Church',
    location: 'Bradenton, FL',
    latitude: 27.4989,
    longitude: -82.5648,
    bio: '',
    avatar: '',
  });

  const [availableChurches, setAvailableChurches] = useState<string[]>(CHURCH_HIERARCHY['Bradenton']);
  
  // States to toggle custom City & Church entry
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [isCustomChurch, setIsCustomChurch] = useState(false);

  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchProfileAndListings();
    }
  }, [status]);

  useEffect(() => {
    if (!isEditing) return;

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
  }, [isEditing]);

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
            if (comp.types.includes('locality')) detectedCity = comp.long_name;
            if (comp.types.includes('administrative_area_level_1')) detectedState = comp.short_name;
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

  const fetchProfileAndListings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/profile');
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to load profile details.');
      
      const currentUser = data.user || data;
      const currentListings = data.listings || [];

      setProfileData(currentUser);
      setUserListings(currentListings);
      
      const userCity = currentUser.city || 'Bradenton';
      const userChurch = currentUser.churchName || 'Grace Family Church';

      // Check if city/church are custom (not in predefined list)
      const cityExists = Object.keys(CHURCH_HIERARCHY).includes(userCity);
      const churches = CHURCH_HIERARCHY[userCity] || [];
      const churchExists = churches.includes(userChurch);

      setIsCustomCity(!cityExists);
      setIsCustomChurch(!churchExists || !cityExists);

      if (cityExists) {
        setAvailableChurches(churches);
      } else {
        setAvailableChurches([userChurch]);
      }

      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        city: userCity,
        state: currentUser.state || 'FL',
        churchName: userChurch,
        location: currentUser.address || `${userCity}, ${currentUser.state || 'FL'}`,
        latitude: currentUser.latitude ?? 27.4989,
        longitude: currentUser.longitude ?? -82.5648,
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

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCity = e.target.value;
    if (selectedCity === 'CUSTOM_NEW_CITY') {
      setIsCustomCity(true);
      setIsCustomChurch(true);
      setFormData((prev) => ({ ...prev, city: '', churchName: '' }));
      return;
    }

    const churches = CHURCH_HIERARCHY[selectedCity] || ['Community Fellowship'];
    setFormData((prev) => ({
      ...prev,
      city: selectedCity,
      churchName: churches[0],
      location: `${selectedCity}, ${prev.state}`
    }));
    setAvailableChurches(churches);
  };

  const handleChurchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedChurch = e.target.value;
    if (selectedChurch === 'CUSTOM_NEW_CHURCH') {
      setIsCustomChurch(true);
      setFormData((prev) => ({ ...prev, churchName: '' }));
      return;
    }
    setFormData((prev) => ({ ...prev, churchName: selectedChurch }));
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
        body: JSON.stringify({ ...formData, address: formData.location }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');

      setProfileData(data.user || data);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
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

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium text-sm">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
        {successMessage && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{successMessage}</div>}

        {/* Profile Card Header */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
          {!isEditing ? (
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
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
                    <span className="bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      📍 {profileData?.city || 'City not set'}, {profileData?.state || 'FL'}
                    </span>
                    <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      ⛪ {profileData?.churchName || 'Church not set'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="bg-amber-50 border border-amber-200 px-4 py-2 text-center">
                  <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">Growbucks</span>
                  <span className="text-lg font-bold text-amber-900">GB {profileData?.growbucks?.toFixed(2) ?? '10.00'}</span>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
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
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Location (Address or Neighborhood)</label>
                <input ref={inputRef} type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Start typing your address..." />
              </div>

              <input type="hidden" name="latitude" value={formData.latitude} />
              <input type="hidden" name="longitude" value={formData.longitude} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* City Selection with Custom Option */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">City</label>
                    {isCustomCity && (
                      <button 
                        type="button" 
                        onClick={() => { setIsCustomCity(false); setIsCustomChurch(false); setFormData(prev => ({...prev, city: 'Bradenton', churchName: CHURCH_HIERARCHY['Bradenton'][0]})); setAvailableChurches(CHURCH_HIERARCHY['Bradenton']); }} 
                        className="text-[11px] text-emerald-600 hover:underline font-semibold"
                      >
                        ← Choose from list
                      </button>
                    )}
                  </div>

                  {!isCustomCity ? (
                    <select name="city" value={formData.city} onChange={handleCityChange} className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer bg-white">
                      {Object.keys(CHURCH_HIERARCHY).map((cityName) => (
                        <option key={cityName} value={cityName}>{cityName}</option>
                      ))}
                      <option value="CUSTOM_NEW_CITY" className="font-bold text-emerald-600">+ Add New City...</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleInputChange} 
                      placeholder="Enter new city name..." 
                      required 
                      className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" 
                    />
                  )}
                </div>

                {/* Church Affiliation Selection with Custom Option */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Church Affiliation</label>
                    {!isCustomCity && !isCustomChurch && (
                      <button 
                        type="button" 
                        onClick={() => { setIsCustomChurch(true); setFormData(prev => ({...prev, churchName: ''})); }} 
                        className="text-[11px] text-emerald-600 hover:underline font-semibold"
                      >
                        + Add custom church
                      </button>
                    )}
                    {isCustomChurch && !isCustomCity && (
                      <button 
                        type="button" 
                        onClick={() => { setIsCustomChurch(false); setFormData(prev => ({...prev, churchName: availableChurches[0] || ''})); }} 
                        className="text-[11px] text-emerald-600 hover:underline font-semibold"
                      >
                        ← Choose from list
                      </button>
                    )}
                  </div>

                  {!isCustomChurch ? (
                    <select name="churchName" value={formData.churchName} onChange={handleChurchChange} className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer bg-white">
                      {availableChurches.map((churchName) => (
                        <option key={churchName} value={churchName}>{churchName}</option>
                      ))}
                      <option value="CUSTOM_NEW_CHURCH" className="font-bold text-emerald-600">+ Add New Church...</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      name="churchName" 
                      value={formData.churchName} 
                      onChange={handleInputChange} 
                      placeholder="Enter new church name..." 
                      required 
                      className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" 
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Profile Photo (Upload from Device)</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {formData.avatar ? <img src={formData.avatar} alt="Avatar Preview" className="w-full h-full object-cover" /> : <span className="text-2xl">👤</span>}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Bio / About You</label>
                <textarea name="bio" rows={3} value={formData.bio} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="submit" disabled={uploadingImage} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50">
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
        <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Marketplace Listings</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage the items and services you have posted to the community.</p>
            </div>

            <Link href="/listings/new" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition-all">
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
                  <div key={item.id} className="border border-slate-200 bg-white flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all group">
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

                      <div className="p-6 pb-2">
                        <h3 className="text-lg font-semibold text-black group-hover:text-slate-900 leading-snug transition-colors">
                          {item.title}
                        </h3>
                        <div className="mt-1.5 text-xs font-medium text-slate-500 flex items-center gap-1.5">
                          <span>✝️</span>
                          <span>{displayCity} &gt; {displayChurch}</span>
                        </div>
                      </div>

                      <div className="p-6 pt-2">
                        <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed font-normal mb-4">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">
                            {dateDisplay}
                          </span>
                          {!isCommercial ? (
                            <span className="text-sm font-semibold text-black shrink-0">
                              {Number(item.priceInBucks) > 0 ? `GB ${Number(item.priceInBucks).toFixed(2)}` : 'Free'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>

                    <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs font-medium text-slate-500">
                      <span className="text-xs font-semibold text-slate-900">
                        {isCommercial ? 'Commercial Storefront' : (Number(item.priceInBucks) > 0 ? `GB ${Number(item.priceInBucks).toFixed(2)}` : 'Free')}
                      </span>

                      <div className="flex items-center gap-2">
                        <Link href={`/listings/${item.id}/edit`} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium">
                          Edit
                        </Link>
                        <button onClick={() => handleDeleteListing(item.id)} className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium cursor-pointer">
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