'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    latitude: '',
    longitude: '',
    city: '',
    state: 'FL',
    churchName: '',
    bio: '',
    avatar: '',
    website: '', // Honeypot field (should remain empty for real users)
  });

  const [taxonomy, setTaxonomy] = useState<any[]>([]);
  
  // Toggle states for custom entries
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('FL');

  const [isAddingChurch, setIsAddingChurch] = useState(false);
  const [newChurch, setNewChurch] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const addressInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Taxonomies from Database on Load
  useEffect(() => {
    fetch('/api/taxonomies')
      .then((res) => res.json())
      .then((taxonomyData) => {
        setTaxonomy(Array.isArray(taxonomyData) ? taxonomyData : []);
      })
      .catch(() => {
        setMessage({ type: 'error', text: 'Failed to load taxonomies.' });
      });
  }, []);

  // 2. Initialize Google Places Autocomplete safely (handles async script loading)
  useEffect(() => {
    let autocompleteInstance: google.maps.places.Autocomplete | null = null;

    const initAutocomplete = () => {
      if (window.google && window.google.maps && addressInputRef.current) {
        const ac = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
        });
        autocompleteInstance = ac;

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (place && place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const formattedAddress = place.formatted_address || addressInputRef.current?.value || '';

            setFormData((prev) => ({
              ...prev,
              address: formattedAddress,
              latitude: String(lat),
              longitude: String(lng),
            }));
          }
        });
        return true;
      }
      return false;
    };

    // Try immediately, or poll/wait if script is still loading asynchronously
    if (!initAutocomplete()) {
      const interval = setInterval(() => {
        if (initAutocomplete()) {
          clearInterval(interval);
        }
      }, 200);

      return () => clearInterval(interval);
    }
  }, []);

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
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');

      setMessage({ type: 'success', text: 'Account created successfully! Redirecting to login...' });
      
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setLoading(false);
    }
  };

  const currentCityTaxonomy = taxonomy.find((t) => t.city.toLowerCase() === (formData.city || '').toLowerCase());
  const availableChurches = currentCityTaxonomy ? currentCityTaxonomy.churches : [];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <main className="w-full pt-1 space-y-4 px-[10px] sm:px-6 max-w-xl mx-auto">
        
        {/* Gray Header & Subheading matching Marketplace & Members pages */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-500">
              SIGN UP FOR FREE
            </h1>
            <div className="text-sm sm:text-base font-medium text-gray-500 space-y-0.5">
              <p>TRADE WITH FRIENDS AND BUSINESSES IN YOUR CITY AND CHURCH.</p>
              <p>TRADE WITH GROWBUCKS NOT YOUR BUCKS!</p>
            </div>
          </div>

          <Link
            href="/login"
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all shadow-xs shrink-0"
          >
            <span>Back to Login</span>
          </Link>
        </div>

        {/* Custom Vector Storefront Banner */}
        <div className="w-full h-56 rounded-xl overflow-hidden shadow-sm border border-slate-200 relative my-4 bg-slate-900 flex flex-col items-center justify-between p-4">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="800" height="300" fill="#0f172a" />
            <rect x="50" y="80" width="700" height="220" fill="#1e293b" rx="8" />
            
            <rect x="80" y="120" width="300" height="180" fill="#334155" opacity="0.4" rx="4" />
            <rect x="420" y="120" width="300" height="180" fill="#334155" opacity="0.4" rx="4" />

            <path d="M40 80 L760 80 L740 40 L60 40 Z" fill="#2563eb" />
            <path d="M120 80 L140 40 M200 80 L220 40 M280 80 L300 40 M360 80 L380 40 M440 80 L460 40 M520 80 L540 40 M600 80 L620 40 M680 80 L700 40" stroke="#1d4ed8" strokeWidth="4" />

            <rect x="250" y="15" width="300" height="35" fill="#f8fafc" rx="4" />
            <text x="400" y="38" fontFamily="sans-serif" fontSize="20" fontWeight="bold" fill="#0f172a" textAnchor="middle">GrowToGive</text>

            <rect x="270" y="90" width="260" height="30" fill="none" stroke="#38bdf8" strokeWidth="2" rx="6" />
            <text x="400" y="111" fontFamily="sans-serif" fontSize="13" fontWeight="bold" fill="#38bdf8" textAnchor="middle" letterSpacing="1">GROWBUCKS ACCEPTED HERE</text>

            <rect x="520" y="220" width="200" height="80" fill="#475569" rx="2" />

            {/* Cashier */}
            <circle cx="640" cy="190" r="10" fill="#854d0e" />
            <line x1="640" y1="200" x2="640" y2="235" stroke="#854d0e" strokeWidth="3.5" />
            <line x1="640" y1="210" x2="615" y2="225" stroke="#854d0e" strokeWidth="3" />
            <line x1="640" y1="235" x2="630" y2="275" stroke="#854d0e" strokeWidth="3.5" />
            <line x1="640" y1="235" x2="650" y2="275" stroke="#854d0e" strokeWidth="3.5" />

            {/* Customer at counter */}
            <circle cx="560" cy="190" r="10" fill="#1c1917" />
            <line x1="560" y1="200" x2="560" y2="235" stroke="#1c1917" strokeWidth="3.5" />
            <line x1="560" y1="210" x2="590" y2="220" stroke="#1c1917" strokeWidth="3" />
            <line x1="560" y1="235" x2="550" y2="275" stroke="#1c1917" strokeWidth="3.5" />
            <line x1="560" y1="235" x2="570" y2="275" stroke="#1c1917" strokeWidth="3.5" />

            {/* GB Bill Pair 1 */}
            <rect x="585" y="210" width="38" height="22" fill="#22c55e" rx="3" stroke="#15803d" strokeWidth="1" />
            <text x="604" y="225" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#ffffff" textAnchor="middle">GB</text>

            {/* Customer in line */}
            <circle cx="360" cy="190" r="10" fill="#f8fafc" />
            <line x1="360" y1="200" x2="360" y2="240" stroke="#f8fafc" strokeWidth="3.5" />
            <line x1="360" y1="215" x2="335" y2="225" stroke="#f8fafc" strokeWidth="3" />
            <line x1="360" y1="240" x2="350" y2="280" stroke="#f8fafc" strokeWidth="3.5" />
            <line x1="360" y1="240" x2="370" y2="280" stroke="#f8fafc" strokeWidth="3.5" />

            {/* Partner exchanging GB bill */}
            <circle cx="280" cy="190" r="10" fill="#facc15" />
            <line x1="280" y1="200" x2="280" y2="240" stroke="#facc15" strokeWidth="3.5" />
            <line x1="280" y1="215" x2="310" y2="225" stroke="#facc15" strokeWidth="3" />
            <line x1="280" y1="240" x2="270" y2="280" stroke="#facc15" strokeWidth="3.5" />
            <line x1="280" y1="240" x2="290" y2="280" stroke="#facc15" strokeWidth="3.5" />

            {/* GB Bill Pair 2 */}
            <rect x="305" y="212" width="38" height="22" fill="#22c55e" rx="3" stroke="#15803d" strokeWidth="1" />
            <text x="324" y="227" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#ffffff" textAnchor="middle">GB</text>

            {/* Waiting customer */}
            <circle cx="160" cy="190" r="10" fill="#a16207" />
            <line x1="160" y1="200" x2="160" y2="240" stroke="#a16207" strokeWidth="3.5" />
            <line x1="160" y1="215" x2="145" y2="230" stroke="#a16207" strokeWidth="3" />
            <line x1="160" y1="215" x2="175" y2="230" stroke="#a16207" strokeWidth="3" />
            <line x1="160" y1="240" x2="150" y2="280" stroke="#a16207" strokeWidth="3.5" />
            <line x1="160" y1="240" x2="170" y2="280" stroke="#a16207" strokeWidth="3.5" />
          </svg>
        </div>

        {/* Main Form Container */}
        <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-900">
          {message.text && (
            <div className={`p-3 mb-4 rounded-xl text-xs font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* --- HONEYPOT FIELD (Hidden from humans, trapped for bots) --- */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            {/* Location / Address with Helper Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Street Address / Location (Google Maps)</label>
              <input
                type="text"
                name="address"
                ref={addressInputRef}
                value={formData.address}
                onChange={handleChange}
                placeholder="Type your address to capture location..."
                required
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-medium">For searching listings by mileage, this is not public</p>
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

              {/* Church Affiliation Selection (Optional) + Add New Church Option */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Church Affiliation (Optional)</label>
                {!isAddingChurch ? (
                  <div className="flex gap-2">
                    <select
                      name="churchName"
                      value={formData.churchName}
                      onChange={handleChange}
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
              <button type="submit" disabled={loading || uploadingImage} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl text-sm transition shadow-xs cursor-pointer disabled:opacity-50">
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}