'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Attendee {
  id: string;
  status: string;
  user: {
    name: string | null;
    email: string;
  };
  createdAt: string;
}

export default function ThanksgivingAttendeesAdminPage() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const eventId = 'thanksgiving-2026';

  useEffect(() => {
    fetchAttendees();
  }, []);

  const fetchAttendees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/events/${eventId}/attendees`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch attendees');
      setAttendees(data.attendees || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter attendees based on search input
  const filteredAttendees = attendees.filter((a) => {
    const name = a.user.name?.toLowerCase() || '';
    const email = a.user.email.toLowerCase();
    const query = searchTerm.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  // Bulk BCC Email Generator
  const handleCopyBccEmails = () => {
    const emails = attendees
      .filter((a) => a.status === 'ATTENDING' && a.user.email)
      .map((a) => a.user.email)
      .join(', ');

    if (!emails) {
      alert('No attending emails found to copy.');
      return;
    }

    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  };

  const totalAttendingCount = attendees.filter((a) => a.status === 'ATTENDING').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-teal-300 font-medium">
        Loading attendees list...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10 font-sans selection:bg-teal-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header & Logo */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-950/60 backdrop-blur-md border border-blue-800/50 rounded-3xl p-6 shadow-2xl gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-12">
              <Image 
                src="/uploads/Logo community transparent.png" 
                alt="GrowToGive Logo" 
                fill 
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">Thanksgiving Event Attendees</h1>
              <p className="text-xs text-teal-300 font-semibold">Total Confirmed Attending: {totalAttendingCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyBccEmails}
              className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg cursor-pointer flex items-center gap-2"
            >
              {copied ? '✓ BCC Emails Copied!' : '📋 Copy All BCC Emails'}
            </button>
            <Link
              href="/thanksgiving-event"
              target="_blank"
              className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-blue-200 font-bold text-xs rounded-xl transition"
            >
              View Public Page ↗
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-950 border border-rose-500/50 text-rose-200 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        {/* Search & Table Section */}
        <div className="bg-blue-950/60 backdrop-blur-md border border-blue-800/50 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-80 p-3 bg-slate-900 border border-blue-900 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition"
            />
            <span className="text-xs text-blue-300 font-medium">Showing {filteredAttendees.length} records</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-blue-900/60 bg-slate-900/80">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-blue-900 text-[11px] font-bold text-teal-400 uppercase tracking-wider bg-slate-950/50">
                  <th className="p-4">Attendee Name</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/40 text-xs">
                {filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500 font-medium">
                      No attendees found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredAttendees.map((attendee) => (
                    <tr key={attendee.id} className="hover:bg-blue-950/40 transition">
                      <td className="p-4 font-bold text-white">{attendee.user.name || 'Unnamed Guest'}</td>
                      <td className="p-4 text-blue-200">{attendee.user.email}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold rounded-full text-[10px] uppercase">
                          {attendee.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(attendee.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}