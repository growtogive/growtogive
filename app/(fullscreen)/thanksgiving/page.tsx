'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ThanksgivingEventPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [numAttending, setNumAttending] = useState('');
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const address = "1920 W Beach, Bradenton, FL 34207";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  useEffect(() => {
    fetchTotalAttendees();
  }, []);

  const fetchTotalAttendees = async () => {
    try {
      const res = await fetch('/api/events/thanksgiving/total');
      const data = await res.json();
      if (data && typeof data.total === 'number') {
        setTotalAttendees(data.total);
      }
    } catch (err) {
      console.error('Failed to load total attendees');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const count = parseInt(numAttending, 10);
    if (isNaN(count) || count < 1) {
      setError('Please enter a number greater than 0.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/events/thanksgiving/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'thanksgiving-2026',
          eventTitle: 'GrowToGive Thanksgiving Celebration',
          name,
          email,
          numAttending: count,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit RSVP. Please try again.');
      }

      setTotalAttendees((prev) => prev + count);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-center items-center px-2 sm:px-6 py-6 sm:py-12 font-sans selection:bg-teal-500 selection:text-white">
      <div className="w-full max-w-3xl bg-gray-50 border border-gray-200 rounded-none sm:rounded-3xl p-4 sm:p-10 shadow-xl space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
          <div className="relative w-28 h-14 shrink-0">
            <Image 
              src="/uploads/Logo community transparent.png" 
              alt="GrowToGive Community Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 font-bold text-[10px] uppercase tracking-widest rounded-full">
                Private Event
              </span>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] uppercase tracking-widest rounded-full">
                👥 {totalAttendees} Attending
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 leading-tight">
              GrowToGive Thanksgiving Celebration
            </h1>
          </div>
        </div>

        {/* Event Info */}
        <div className="text-center space-y-2">
          <p className="text-teal-700 font-bold text-sm sm:text-base">
            Sunday Nov 22, 2026 at 2pm
          </p>
          <p className="text-gray-600 text-sm font-medium max-w-lg mx-auto leading-relaxed">
            Free food, fishing, t-ball, live entertainment, and more!
          </p>
        </div>

        {/* Location & Video Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-600">Event Address</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{address}</p>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0 shadow-sm flex items-center justify-center sm:justify-start gap-1.5"
            >
              📍 Get Directions
            </a>
          </div>

          {/* Official Canva Smart Embed Video Player (Stretched Full Width) */}
          <div className="w-full">
            <div style={{
              position: 'relative',
              width: '100%',
              height: 0,
              paddingTop: '56.2500%',
              paddingBottom: 0,
              boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)',
              overflow: 'hidden',
              borderRadius: '12px',
              willChange: 'transform'
            }}>
              <iframe
                loading="lazy"
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                  border: 'none',
                  padding: 0,
                  margin: 0
                }}
                src="https://www.canva.com/design/DAGaAUWn4Hk/yV6yBKAjhopQg7Ywvqx_ZA/watch?embed"
                allowFullScreen
                allow="fullscreen"
              />
            </div>
          </div>

          {/* Map Display (Stretched Full Width) */}
          <div className="w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-gray-200">
            <iframe
              title="Event Location Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        </div>

        {/* RSVP Form */}
        {success ? (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-teal-900">You're Registered!</h3>
            <p className="text-xs text-teal-800 leading-relaxed">
              Thank you for RSVPing, <span className="font-bold text-gray-900">{name}</span>! We look forward to seeing your total party of <span className="font-bold text-gray-900">{numAttending}</span> on Sunday, Nov 22.
            </p>
            <button
              onClick={() => { setSuccess(false); setName(''); setEmail(''); setNumAttending(''); }}
              className="mt-3 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-xs font-bold text-white rounded-xl transition-colors cursor-pointer"
            >
              Register Another Guest
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <h3 className="text-xs font-black text-teal-700 uppercase tracking-widest">Reserve Your Spot</h3>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Attendee Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-600 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Total Attending</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={numAttending}
                  onChange={(e) => setNumAttending(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 mt-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-md"
            >
              {submitting ? 'Submitting RSVP...' : 'Submit Thanksgiving RSVP'}
            </button>
          </form>
        )}

        {/* Footer info with Distinct Donation Buttons */}
        <div className="text-center pt-4 border-t border-gray-200 space-y-3">
          
          <div className="flex flex-col gap-2.5">
            {/* Square Checkout Button */}
            <a
              href="https://checkout.square.site/merchant/MLEBDG9P30T1T/checkout/JMS2NWPRDW6RZJOVC2NZD6UX"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-sm text-center flex items-center justify-center gap-2"
            >
              <span>💳</span> Donate - Credit/Debit Card, Cash App, GPay
            </a>

            {/* PayPal Checkout Button */}
            <a
              href="https://www.paypal.com/ncp/payment/U9A8LFNC5C8S4"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-sm text-center flex items-center justify-center gap-2"
            >
              <span>🅿️</span> Donate - PayPal, Venmo, Apple Pay
            </a>
          </div>

          <p className="text-[11px] text-gray-500 font-medium pt-2">
            GrowToGive - 941.216.1181
          </p>
        </div>

      </div>
    </div>
  );
}