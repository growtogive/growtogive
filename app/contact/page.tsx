'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function ContactFormContent() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const searchParams = useSearchParams();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [hpField, setHpField] = useState(''); // Honeypot field

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Auto-populate subject and message if passed via query params (e.g., from a listing report)
  useEffect(() => {
    const paramSubject = searchParams.get('subject');
    const paramMessage = searchParams.get('message');
    if (paramSubject) setSubject(paramSubject);
    if (paramMessage) setMessage(paramMessage);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Honeypot check: bots fill this out, humans don't see it
    if (hpField) {
      setSuccess(true);
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setError('Please fill out both the subject and message fields.');
      return;
    }

    if (!user && (!guestName.trim() || !guestEmail.trim())) {
      setError('Please provide your name and email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message,
          name: user ? user.name : guestName,
          email: user ? user.email : guestEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-16">
      <div className="mb-8 text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Contact Support & Team
        </h1>
        <p className="text-sm text-slate-500">
          Have a question, feedback, or need to report a listing? Drop us a message below.
        </p>
      </div>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto font-bold text-xl">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-900">Message Sent Successfully!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Thank you for reaching out. A member of our team will review your report/message shortly.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Send Another Message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
              {error}
            </div>
          )}

          {user ? (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Sending as:</span>
              <span className="font-bold text-slate-800">{user.name} ({user.email})</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Email</label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this regarding?"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 resize-y"
            />
          </div>

          {/* Honeypot field (hidden from users) */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="website_hp">Website URL</label>
            <input
              type="text"
              id="website_hp"
              name="website_hp"
              value={hpField}
              onChange={(e) => setHpField(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Sending Message...' : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <Suspense fallback={<div className="text-center pt-20 text-xs text-slate-400">Loading contact form...</div>}>
        <ContactFormContent />
      </Suspense>
    </div>
  );
}