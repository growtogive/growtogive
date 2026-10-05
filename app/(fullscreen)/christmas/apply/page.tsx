"use client";

import { useState, useEffect, useRef } from "react";
import { submitChristmasApplication } from "@/actions/christmas";
import { cleanText } from "@/utils/textFormatter";

interface KidInput {
  name: string;
  age: string;
  gender: string;
  giftOne: string;
  giftTwo: string;
}

export default function ChristmasApplyPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [momName, setMomName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [donorNotes, setDonorNotes] = useState("");

  const [kids, setKids] = useState<KidInput[]>([
    { name: "", age: "", gender: "Boy", giftOne: "", giftTwo: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const addressInputRef = useRef<HTMLInputElement>(null);

  // Google Places Autocomplete Hook
  useEffect(() => {
    if (isAuthenticated && window.google && addressInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ["address"],
        componentRestrictions: { country: "us" },
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          setAddress(place.formatted_address);
        }
      });
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "CSMK2026") {
      setIsAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect access password.");
    }
  };

  const handleAddKid = () => {
    setKids([...kids, { name: "", age: "", gender: "Boy", giftOne: "", giftTwo: "" }]);
  };

  const handleRemoveKid = (index: number) => {
    if (kids.length === 1) return;
    setKids(kids.filter((_, i) => i !== index));
  };

  const handleKidChange = (index: number, field: keyof KidInput, value: string) => {
    const updated = [...kids];
    updated[index][field] = value;
    setKids(updated);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!momName.trim() || !phone.trim() || !address.trim() || !referredBy.trim()) {
      setErrorMessage("All parent information fields including 'Referred By' and Address are mandatory.");
      setLoading(false);
      return;
    }

    for (const kid of kids) {
      if (!kid.name.trim() || !kid.age || !kid.gender || !kid.giftOne.trim() || !kid.giftTwo.trim()) {
        setErrorMessage("All fields for every child (Name, Age, Gender, and both ~$25 Gifts) are mandatory.");
        setLoading(false);
        return;
      }
    }

    try {
      const formattedKids = kids.map((k) => ({
        name: cleanText(k.name),
        age: parseInt(k.age) || 0,
        gender: k.gender,
        giftOne: cleanText(k.giftOne),
        giftTwo: cleanText(k.giftTwo),
      }));

      const res = await submitChristmasApplication({
        password: "CSMK2026",
        momName: cleanText(momName),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: cleanText(address),
        referredBy: cleanText(referredBy),
        donorNotes: donorNotes.trim() ? cleanText(donorNotes) : undefined,
        kids: formattedKids,
      });

      if (res.success) {
        setSuccessMessage("Application submitted successfully! Your tracking tags have been generated.");
        setMomName("");
        setPhone("");
        setEmail("");
        setAddress("");
        setReferredBy("");
        setDonorNotes("");
        setKids([{ name: "", age: "", gender: "Boy", giftOne: "", giftTwo: "" }]);
      } else {
        setErrorMessage(res.error || "Submission failed.");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md border">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">GrowToGive Christmas</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Enter password to access application form.</p>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              placeholder="Access Password"
            />
            {passwordError && <p className="text-red-500 text-xs">{passwordError}</p>}
            <button type="submit" className="w-full bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition">
              Enter Form
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-2">Christmas Assistance Application</h1>
        <p className="text-sm text-gray-500 text-center mb-8">All fields are mandatory. Text capitalization is auto-corrected.</p>

        {successMessage && <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-center font-medium">{successMessage}</div>}
        {errorMessage && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center font-medium">{errorMessage}</div>}

        <form onSubmit={handleSubmitForm} className="space-y-6">
          <div className="space-y-4 border-b pb-6">
            <h2 className="text-lg font-bold text-gray-800">Parent / Guardian Information (All Required)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={momName}
                  onChange={(e) => setMomName(e.target.value)}
                  onBlur={() => setMomName(cleanText(momName))}
                  required
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                  placeholder="(555) 000-0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Street Address (Google Dropdown)</label>
              <input
                ref={addressInputRef}
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg text-sm"
                placeholder="Start typing home address..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Referred By</label>
                <input
                  type="text"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  onBlur={() => setReferredBy(cleanText(referredBy))}
                  required
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                  placeholder="Agency or Person"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Special notes or comments for our Donors?</label>
              <textarea
                value={donorNotes}
                onChange={(e) => setDonorNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border rounded-lg text-sm"
                placeholder="Optional notes regarding clothing sizes or context..."
              />
            </div>
          </div>

          {/* Kids Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Children & Gift Wishlists</h2>
              <button type="button" onClick={handleAddKid} className="text-xs bg-gray-100 hover:bg-gray-200 font-semibold px-3 py-1.5 rounded-lg">
                + Add Another Child
              </button>
            </div>

            {kids.map((kid, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 relative">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase">Child #{index + 1} (All Fields Required)</span>
                  {kids.length > 1 && (
                    <button type="button" onClick={() => handleRemoveKid(index)} className="text-xs text-red-600 font-medium">Remove</button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Child's Name</label>
                    <input
                      type="text"
                      value={kid.name}
                      onChange={(e) => handleKidChange(index, "name", e.target.value)}
                      onBlur={() => handleKidChange(index, "name", cleanText(kid.name))}
                      required
                      className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white"
                      placeholder="First Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Age</label>
                    <input
                      type="number"
                      value={kid.age}
                      onChange={(e) => handleKidChange(index, "age", e.target.value)}
                      required
                      min="0"
                      max="18"
                      className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white"
                      placeholder="Age"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Gender</label>
                    <select
                      value={kid.gender}
                      onChange={(e) => handleKidChange(index, "gender", e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white font-medium"
                    >
                      <option value="Boy">Boy</option>
                      <option value="Girl">Girl</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">List a gift around $25 (Option 1)</label>
                    <input
                      type="text"
                      value={kid.giftOne}
                      onChange={(e) => handleKidChange(index, "giftOne", e.target.value)}
                      onBlur={() => handleKidChange(index, "giftOne", cleanText(kid.giftOne))}
                      required
                      className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white"
                      placeholder="e.g., Lego set"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">List a gift around $25 (Option 2)</label>
                  <input
                    type="text"
                    value={kid.giftTwo}
                    onChange={(e) => handleKidChange(index, "giftTwo", e.target.value)}
                    onBlur={() => handleKidChange(index, "giftTwo", cleanText(kid.giftTwo))}
                    required
                    className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white"
                    placeholder="e.g., Board game"
                  />
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition shadow-md">
            {loading ? "Submitting Application..." : "Submit Christmas Application"}
          </button>
        </form>
      </div>
    </div>
  );
}