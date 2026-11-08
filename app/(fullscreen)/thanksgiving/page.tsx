'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ThanksgivingEventPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [numAttending, setNumAttending] = useState('1');
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
    setSubmitting(true);
    setError('');

    const count = parseInt(numAttending) || 1;

    try {
      const res = await fetch('/api/events/thanksgiving/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'thanksgiving-2026', // Required identifier for backend/Prisma
          eventTitle: 'GrowToGive Thanksgiving Celebration',
          name,
          email,
          numAttending: count,
          status: 'CONFIRMED',
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 font-sans selection:bg-teal-500 selection:text-white">
      <div className="w-full max-w-xl bg-blue-950/60 backdrop-blur-md border border-blue-800/50 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8">
        
        {/* Logo & Header Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative w-40 h-20">
              {/* FIXED: Removed '/public' from the path */}
              <Image 
                src="/uploads/Logo community transparent.png" 
                alt="GrowToGive Community Logo" 
                fill 
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-2 pt-1">
            <span className="px-3.5 py-1.5 bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold text-xs uppercase tracking-widest rounded-full">
              Private Community Event
            </span>
            <span className="px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 font-bold text-xs uppercase tracking-widest rounded-full">
              👥 {totalAttendees} Attending
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            GrowToGive Thanksgiving Celebration
          </h1>
          <p className="text-teal-300 font-bold text-sm sm:text-base">
            Sunday Nov 22, 2026 at 2pm
          </p>
          <p className="text-blue-200/90 text-sm font-medium max-w-md mx-auto pt-1 leading-relaxed">
            Free food, fishing, t-ball, live entertainment, and more!
          </p>
        </div>

        {/* Location & Directions Card */}
        <div className="bg-slate-900/80 border border-blue-900/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-400">Event Address</p>
              <p className="text-sm font-bold text-white mt-0.5">{address}</p>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-colors shrink-0 shadow-md flex items-center gap-1.5"
            >
              📍 Get Directions
            </a>
          </div>

          <div className="w-full h-44 rounded-xl overflow-hidden border border-blue-900/50 mt-2">
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

        {/* RSVP Form or Success State */}
        {success ? (
          <div className="bg-teal-950/70 border border-teal-500/40 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-teal-500/20 text-teal-300 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-teal-200">You're Registered!</h3>
            <p className="text-xs text-teal-300/90 leading-relaxed">
              Thank you for RSVPing, <span className="font-bold text-white">{name}</span>! We look forward to seeing your group of <span className="font-bold text-white">{numAttending}</span> on Sunday, Nov 22.
            </p>
            <button
              onClick={() => { setSuccess(false); setName(''); setEmail(''); setNumAttending('1'); }}
              className="mt-3 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-xs font-bold text-blue-200 rounded-xl transition-colors cursor-pointer"
            >
              Register Another Guest
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <h3 className="text-xs font-black text-teal-400 uppercase tracking-widest">Reserve Your Spot</h3>

            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-200 uppercase tracking-wider">Attendee Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full p-3 bg-slate-900 border border-blue-900 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-blue-200 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full p-3 bg-slate-900 border border-blue-900 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-blue-200 uppercase tracking-wider">Number Attending</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={numAttending}
                  onChange={(e) => setNumAttending(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-blue-900 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-teal-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 mt-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs uppercase tracking-widest rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-lg"
            >
              {submitting ? 'Submitting RSVP...' : 'Submit Thanksgiving RSVP'}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-blue-900/60">
          <p className="text-[11px] text-blue-300/70 font-medium">
            GrowToGive - 941.216.1181
          </p>
        </div>

      </div>
    </div>
  );
}