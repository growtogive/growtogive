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

  if (loading) return <div className="p-8 text-center text-gray-600">Loading admin records...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
          Thanksgiving Event Admin Dashboard
        </h1>
        <button
          onClick={handleCopyBccEmails}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm w-full sm:w-auto text-center"
        >
          {copied ? 'Copied BCC Emails!' : 'Copy Bulk BCC Emails'}
        </button>
      </div>

      {/* Totals Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-5 sm:p-6 rounded-lg shadow border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Attendee Records</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{totals.totalAttendees}</p>
        </div>
        <div className="bg-white p-5 sm:p-6 rounded-lg shadow border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total People (incl. Guests)</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{totals.totalGuests}</p>
        </div>
      </div>

      {/* Table & Inline Editing UI with Mobile Overflow Wrapper */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendee</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendees.map((attendee) => {
                const isEditing = editingId === attendee.id;
                return (
                  <tr key={attendee.id}>
                    <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 max-w-50 wrap-break-word">
                      {attendee.user?.name || 'Unnamed User'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 max-w-55 wrap-break-word">
                      <div>{attendee.user?.email}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{attendee.user?.userPhone || 'No phone'}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-20 border rounded px-2 py-1 text-sm"
                          value={editForm.guestCount}
                          onChange={(e) => setEditForm({ ...editForm, guestCount: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        attendee.guestCount
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleSave(attendee.id)}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(attendee)}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}