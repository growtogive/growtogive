'use client';

import React, { useEffect, useState } from 'react';

export default function ThanksgivingAdminPage() {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [totals, setTotals] = useState({ totalAttendees: 0, totalGuests: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    guestCount: 0,
  });

  const fetchAttendees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/thanksgiving');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch attendees');
      
      setAttendees(data.attendees || []);
      setTotals(data.totals || { totalAttendees: 0, totalGuests: 0 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  const handleCopyBccEmails = () => {
    const emails = attendees
      .map((a) => a.user?.email)
      .filter((email): email is string => Boolean(email));
    
    const uniqueEmails = Array.from(new Set(emails)).join(', ');

    if (!uniqueEmails) {
      alert('No attendee emails found to copy.');
      return;
    }

    navigator.clipboard.writeText(uniqueEmails);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleEditClick = (attendee: any) => {
    setEditingId(attendee.id);
    setEditForm({
      guestCount: attendee.guestCount ?? 0,
    });
  };

  const handleSave = async (attendeeId: string) => {
    try {
      const res = await fetch('/api/admin/thanksgiving', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId,
          guestCount: Number(editForm.guestCount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update record');

      setEditingId(null);
      fetchAttendees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (attendeeId: string) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return;
    try {
      const res = await fetch('/api/admin/thanksgiving', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendeeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');

      fetchAttendees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-600 font-medium">Loading admin records...</div>;
  if (error) return <div className="p-8 text-center text-red-600 font-medium">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            Thanksgiving Event Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage RSVPs, guest counts, and communications.</p>
        </div>
        <button
          onClick={handleCopyBccEmails}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm w-full sm:w-auto text-center"
        >
          {copied ? '✓ Copied BCC Emails!' : '📋 Copy Bulk BCC Emails'}
        </button>
      </div>

      {/* Totals Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Total Attendee Records</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{totals.totalAttendees}</p>
        </div>
        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Total People (incl. Guests)</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{totals.totalGuests}</p>
        </div>
      </div>

      {/* Mobile Card List View (< sm screens) */}
      <div className="block sm:hidden space-y-4">
        {attendees.length === 0 ? (
          <div className="bg-white p-6 rounded-xl text-center text-gray-400 border border-gray-200">No RSVPs found.</div>
        ) : (
          attendees.map((attendee) => {
            const isEditing = editingId === attendee.id;
            return (
              <div key={attendee.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3">
                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{attendee.user?.name || 'Unnamed User'}</h3>
                    <p className="text-xs text-gray-500">{attendee.user?.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{attendee.user?.userPhone || 'No phone'}</p>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2.5 py-1 rounded-full border border-indigo-100">
                    Guests: {isEditing ? (
                      <input
                        type="number"
                        className="w-12 border rounded px-1 text-center bg-white"
                        value={editForm.guestCount}
                        onChange={(e) => setEditForm({ ...editForm, guestCount: parseInt(e.target.value) || 0 })}
                      />
                    ) : (
                      attendee.guestCount
                    )}
                  </span>
                </div>

                <div className="flex justify-end items-center gap-3 pt-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSave(attendee.id)}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-semibold"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditClick(attendee)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-indigo-700 px-3 py-1.5 rounded-lg font-semibold border"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(attendee.id)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-semibold border border-red-200"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (sm+ screens) */}
      <div className="hidden sm:block bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendee</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Guests</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">No RSVPs found.</td>
                </tr>
              ) : (
                attendees.map((attendee) => {
                  const isEditing = editingId === attendee.id;
                  return (
                    <tr key={attendee.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate">
                        {attendee.user?.name || 'Unnamed User'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        <div>{attendee.user?.email}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{attendee.user?.userPhone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-20 border rounded px-2 py-1 text-sm bg-white"
                            value={editForm.guestCount}
                            onChange={(e) => setEditForm({ ...editForm, guestCount: parseInt(e.target.value) || 0 })}
                          />
                        ) : (
                          attendee.guestCount
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              onClick={() => handleSave(attendee.id)}
                              className="text-indigo-600 hover:text-indigo-900 font-semibold text-xs bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-500 hover:text-gray-700 text-xs bg-gray-100 px-3 py-1.5 rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              onClick={() => handleEditClick(attendee)}
                              className="text-indigo-600 hover:text-indigo-900 font-semibold text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(attendee.id)}
                              className="text-red-600 hover:text-red-900 font-semibold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}