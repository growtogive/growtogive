"use client";

import { useState, useEffect } from "react";
import { 
  getLocations, 
  createLocation, 
  getAdminChristmasData, 
  updateKidStatusAndLocation, 
  deleteChristmasApplication 
} from "@/actions/locations";

export default function ChristmasAdminPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appData, locData] = await Promise.all([
        getAdminChristmasData(),
        getLocations(),
      ]);
      setApplications(appData);
      setLocations(locData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (kidId: string, status: string, locationId: string | null) => {
    const res = await updateKidStatusAndLocation(kidId, status, locationId);
    if (res.success) loadData();
    else alert(res.error || "Failed to update status");
  };

  const handleDeleteApp = async (appId: string) => {
    if (!confirm("Are you sure you want to delete this application? Pending tags will automatically resequence.")) return;
    const res = await deleteChristmasApplication(appId);
    if (res.success) loadData();
    else alert(res.error || "Failed to delete");
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    const res = await createLocation(newLocationName);
    if (res.success) {
      setNewLocationName("");
      loadData();
    } else {
      alert(res.error || "Failed to add location");
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading Christmas Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Christmas Charity Dashboard</h1>
            <p className="text-sm text-gray-500">Manage submissions, referrals, addresses, and gift statuses.</p>
          </div>
          <button onClick={loadData} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">
            Refresh Data
          </button>
        </div>

        {/* Location Management */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Manage Drop-off / Pickup Locations</h2>
          <form onSubmit={handleAddLocation} className="flex gap-3 max-w-md mb-4">
            <input
              type="text"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder="New Location Name..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold rounded-lg">
              Add Location
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => (
              <span key={loc.id} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium border">
                {loc.name}
              </span>
            ))}
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold text-gray-800">Submitted Families ({applications.length})</h2>
          </div>

          <div className="divide-y">
            {applications.length === 0 ? (
              <p className="p-6 text-center text-gray-400">No applications submitted yet.</p>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="p-6 space-y-4 hover:bg-gray-50/50 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{app.momName}</h3>
                      <p className="text-xs text-gray-500">Phone: {app.phone} | Email: {app.email || "N/A"}</p>
                      <p className="text-xs text-blue-600 font-semibold mt-1">🤝 Referred By: {app.referredBy}</p>
                      <p className="text-xs text-gray-600 font-medium">📍 Address: {app.address}</p>
                      {app.donorNotes && (
                        <p className="text-xs bg-amber-50 text-amber-800 p-2 rounded mt-1 border border-amber-200">
                          <strong>Donor Note:</strong> "{app.donorNotes}"
                        </p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteApp(app.id)} className="text-xs text-red-600 hover:text-red-800 font-semibold">
                      Delete Application
                    </button>
                  </div>

                  {/* Kids Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {app.kids.map((kid: any) => (
                      <div key={kid.id} className="bg-white p-4 rounded-lg border shadow-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="bg-red-600 text-white font-extrabold text-xs px-2 py-0.5 rounded">
                            Tag: {kid.tagNumber}
                          </span>
                          <span className="text-xs font-semibold text-gray-600">{kid.gender} • Age {kid.age}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{kid.name}</p>
                        
                        <div className="text-xs bg-gray-50 p-2 rounded border space-y-1">
                          <p>🎁 <strong>Gift 1:</strong> {kid.giftOne}</p>
                          <p>🎁 <strong>Gift 2:</strong> {kid.giftTwo}</p>
                        </div>

                        {/* Status / Location Dropdowns */}
                        <div className="space-y-1.5 pt-2 border-t">
                          <select
                            value={kid.status}
                            onChange={(e) => handleStatusChange(kid.id, e.target.value, kid.locationId)}
                            className="w-full text-xs px-2 py-1 border rounded bg-white font-medium"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="PLACED">PLACED</option>
                            <option value="CLAIMED">CLAIMED</option>
                            <option value="PICKED_UP">PICKED UP</option>
                            <option value="WRAPPED">WRAPPED</option>
                          </select>

                          <select
                            value={kid.locationId || ""}
                            onChange={(e) => handleStatusChange(kid.id, kid.status, e.target.value || null)}
                            className="w-full text-xs px-2 py-1 border rounded bg-white font-medium"
                          >
                            <option value="">-- No Location Assigned --</option>
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}