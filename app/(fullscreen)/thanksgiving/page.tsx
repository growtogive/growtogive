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

  // Event details for calendar web links
  const eventTitle = encodeURIComponent('GrowToGive Thanksgiving Celebration');
  const eventDetails = encodeURIComponent(`Free food, fishing, t-ball, live entertainment, and more! Party of ${numAttending}.`);
  const eventLocation = encodeURIComponent(address);
  // Sunday Nov 22, 2026 from 2:00 PM to 5:00 PM EST (19:00 to 22:00 UTC)
  const startTime = '20261122T190000Z';
  const endTime = '20261122T220000Z';

  // Direct Calendar Links that pop open instantly
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startTime}/${endTime}&details=${eventDetails}&location=${eventLocation}`;
  const outlookCalendarUrl = `https://outlook.live.com/calendar/0/action/compose?subject=${eventTitle}&startdt=2026-11-22T19:00:00Z&enddt=2026-11-22T22:00:00Z&body=${eventDetails}&location=${eventLocation}`;
  const yahooCalendarUrl = `https://calendar.yahoo.com/?v=60&title=${eventTitle}&st=20261122T190000Z&et=20261122T220000Z&desc=${eventDetails}&in_loc=${eventLocation}`;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-center items-center px-0 sm:px-6 py-0 sm:py-12 font-sans selection:bg-teal-500 selection:text-white text-base">
      <div className="w-full max-w-3xl bg-gray-50 border-0 sm:border border-gray-200 rounded-none sm:rounded-3xl p-0 sm:p-10 shadow-none sm:shadow-xl space-y-6 sm:space-y-8">
        
        {/* Header Section: Logo & Title on same row, Badges below */}
        <div className="px-4 sm:px-0 pt-6 sm:pt-0 pb-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center gap-4">
            <div className="relative w-32 h-16 shrink-0">
              <Image 
                src="/uploads/Logo community transparent.png" 
                alt="GrowToGive Community Logo" 
                fill 
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-gray-900 leading-tight">
              GrowToGive Thanksgiving Celebration
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-teal-100 text-teal-800 font-bold text-xs uppercase tracking-widest rounded-full">
              Private Event
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold text-xs uppercase tracking-widest rounded-full">
              👥 {totalAttendees} Attending
            </span>
          </div>
        </div>

        {/* Event Info */}
        <div className="px-4 sm:px-0 text-center space-y-2">
          <p className="text-teal-700 font-bold text-base sm:text-lg">
            Sunday Nov 22, 2026 at 2pm
          </p>
          <p className="text-gray-700 text-base font-medium max-w-lg mx-auto leading-relaxed">
            Free food, fishing, t-ball, live entertainment, and more!
          </p>
        </div>

        {/* Video Section - Edge-to-Edge on Mobile */}
        <div className="w-full my-1 sm:my-0">
          <div style={{
            position: 'relative',
            width: '100%',
            height: 0,
            paddingTop: '75%',
            paddingBottom: 0,
            overflow: 'hidden',
            borderRadius: '0px',
            willChange: 'transform'
          }} className="sm:pt-[56.25%]! sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-sm">
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

        {/* Location Section */}
        <div className="px-4 sm:px-0 bg-transparent sm:bg-white sm:border sm:border-gray-200 sm:rounded-2xl sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-600">Event Address</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{address}</p>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-colors shrink-0 shadow-sm flex items-center justify-center gap-1.5"
            >
              📍 Get Directions
            </a>
          </div>

          {/* Map Display */}
          <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-gray-200">
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

        {/* RSVP Form with Direct Calendar Pop-up Links */}
        <div className="px-4 sm:px-0 space-y-4 mb-8">
          {success ? (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-teal-900">You're Registered!</h3>
              <p className="text-sm text-teal-800 leading-relaxed">
                Thank you for RSVPing, <span className="font-bold text-gray-900">{name}</span>! We look forward to seeing your total party of <span className="font-bold text-gray-900">{numAttending}</span> on Sunday, Nov 22.
              </p>

              {/* Instant Calendar Pop-up Options */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-800">Add to your calendar:</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <a
                    href={googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    📅 Google Calendar
                  </a>
                  <a
                    href={outlookCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    📅 Outlook
                  </a>
                  <a
                    href={yahooCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    📅 Yahoo
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => { setSuccess(false); setName(''); setEmail(''); setNumAttending(''); }}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-xs font-bold text-white rounded-xl transition-colors cursor-pointer"
                >
                  Register Another Guest
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-teal-700 uppercase tracking-widest">Reserve Your Spot</h3>

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-xl">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Attendee Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full p-3.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full p-3.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Total Attending</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={numAttending}
                    onChange={(e) => setNumAttending(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full p-3.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 mt-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm uppercase tracking-widest rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-md"
              >
                {submitting ? 'Submitting RSVP...' : 'Submit Thanksgiving RSVP'}
              </button>
            </form>
          )}
        </div>

        {/* Footer info with Donation Buttons */}
        <div className="px-4 sm:px-0 text-center pt-6 pb-6 sm:pb-0 border-t border-gray-200 space-y-3">
          
          <div className="flex flex-col gap-3">
            <a
              href="https://checkout.square.site/merchant/MLEBDG9P30T1T/checkout/JMS2NWPRDW6RZJOVC2NZD6UX"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-colors shadow-sm text-center flex items-center justify-center gap-2"
            >
              <span>💳</span> Donate - Credit/Debit Card, Cash App, GPay
            </a>

            <a
              href="https://www.paypal.com/ncp/payment/U9A8LFNC5C8S4"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-colors shadow-sm text-center flex items-center justify-center gap-2"
            >
              <span>🅿️</span> Donate - PayPal, Venmo, Apple Pay
            </a>
          </div>

          <p className="text-xs text-gray-500 font-semibold pt-2">
            GrowToGive - 941.216.1181
          </p>
        </div>

      </div>
    </div>
  );
}