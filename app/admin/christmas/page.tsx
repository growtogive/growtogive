"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  getLocations, 
  createLocation, 
  getAdminChristmasData, 
  updateKidStatusAndLocation, 
  updateKidDetails,
  deleteChristmasApplication 
} from "@/actions/locations";

export default function ChristmasAdminPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");

  // Edit Kid Modal State
  const [editingKid, setEditingKid] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    age: "",
    gender: "",
    giftOne: "",
    giftTwo: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [appData, locData] = await Promise.all([
        getAdminChristmasData(),
        getLocations(),
      ]);
      
      const sortedApps = (appData || []).sort((a: any, b: any) => 
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );

      setApplications(sortedApps);
      setLocations(locData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (kidId: string, status: string, locationId: string | null, giftNumber: number) => {
    const res = await updateKidStatusAndLocation(kidId, status, locationId, giftNumber);
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

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setLocationFilter("ALL");
  };

  const openEditModal = (kid: any, tagId: string) => {
    setEditingKid({ ...kid, tagNumber: kid.tagNumber || tagId });
    setEditForm({
      name: kid.name || "",
      age: kid.age?.toString() || "",
      gender: kid.gender || "",
      giftOne: kid.giftOne || "",
      giftTwo: kid.giftTwo || "",
    });
  };

  const handleSaveKid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKid) return;

    const res = await updateKidDetails(editingKid.id, {
      name: editForm.name,
      age: Number(editForm.age),
      gender: editForm.gender,
      giftOne: editForm.giftOne,
      giftTwo: editForm.giftTwo,
      tagNumber: editingKid.tagNumber,
    });

    if (res.success) {
      setEditingKid(null);
      loadData();
    } else {
      alert(res.error || "Failed to update tag details");
    }
  };

  const getFamilyTags = (app: any, appIndex: number) => {
    const familyNumber = appIndex + 1;
    const tags: any[] = [];

    if (app.kids && Array.isArray(app.kids)) {
      app.kids.forEach((kid: any, kidIndex: number) => {
        const childNumber = kidIndex + 1;
        if (kid.giftOne) {
          tags.push({
            tagId: `${familyNumber}-${childNumber}A`,
            kid,
            giftText: kid.giftOne,
            giftNumber: 1,
          });
        }
        if (kid.giftTwo) {
          tags.push({
            tagId: `${familyNumber}-${childNumber}B`,
            kid,
            giftText: kid.giftTwo,
            giftNumber: 2,
          });
        }
      });
    }

    return { familyNumber, tags };
  };

  const getKidGiftStatus = (kid: any, giftNumber: number) => {
    if (giftNumber === 1) return kid.giftOneStatus || kid.status || "PENDING";
    return kid.giftTwoStatus || kid.status || "PENDING";
  };

  const getKidGiftLocationId = (kid: any, giftNumber: number) => {
    if (giftNumber === 1) return kid.giftOneLocationId || kid.locationId || "";
    return kid.giftTwoLocationId || kid.locationId || "";
  };

  const handlePrintTags = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print tags.");
      return;
    }

    let allTags: { kid: any; giftText: string; tagId: string }[] = [];
    applications.forEach((app, appIndex) => {
      const { tags } = getFamilyTags(app, appIndex);
      allTags = allTags.concat(tags);
    });

    // Group tags into pages of 6
    let pagesHtml = "";
    for (let i = 0; i < allTags.length; i += 6) {
      const pageTags = allTags.slice(i, i + 6);
      let pageCardsHtml = "";
      pageTags.forEach((tag) => {
        pageCardsHtml += generateTagHtml(tag.kid, tag.giftText, tag.tagId);
      });

      pagesHtml += `
        <div class="page">
          <div class="tag-grid">
            ${pageCardsHtml}
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Christmas Gift Tags</title>
          <style>
            @page {
              size: 8.5in 11in;
              margin: 0.50in;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #111;
              background: #fff;
            }
            .page {
              width: 7.5in;
              height: 10.0in;
              box-sizing: border-box;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .tag-grid {
              display: grid;
              grid-template-columns: repeat(2, 3.5in);
              grid-template-rows: repeat(3, 3.1in);
              gap: .250in;
              justify-content: center;
              align-content: center;
              width: 100%;
            }
            .tag-card {
              width: 3.5in;
              height: 3.1in;
              border: none;
              padding: 8px 16px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-inside: avoid;
              background: #fff;
            }
            .tag-header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 6px; }
            .tag-title { font-size: 14px; font-weight: 900; color: #dc2626; margin: 2px 0 0 0; text-transform: uppercase; }
            .tag-subtitle { font-size: 9px; color: #555; margin: 0; text-transform: uppercase; font-weight: bold; }
            .tag-body { font-size: 14px; display: flex; flex-direction: column; justify-content: space-evenly; flex-grow: 1; margin: 6px 0; }
            .tag-message { font-size: 14px; font-weight: bold; color: #111; margin: 12px; }
            .tag-footer { text-align: center; border-top: 1px solid #eee; padding-top: 4px; font-size: 8px; color: #666; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin: 20px 0;" class="no-print">
            <button onclick="window.print()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Print Tags</button>
          </div>
          ${pagesHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generateTagHtml = (kid: any, giftText: string, tagIdCode: string) => {
    return `
      <div class="tag-card">
        <div class="tag-header">
          <p class="tag-subtitle">8TH ANNUAL</p>
          <h3 class="tag-title">CHRISTMAS for SINGLE MOMS & KIDS</h3>
        </div>
        <div class="tag-body">
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 12px;">
            <span style="color: #dc2626;">Tag ID: ${tagIdCode}</span>
            <span>Age: ${kid.age} (${kid.gender})</span>
          </div>
          <p style="margin: 0 0 10px 0;"><strong>Child Name:</strong> ${kid.name}</p>
          <p style="margin: 0 0 14px 0;"><strong>Gift Desired:</strong> ${giftText}</p>
          <div>
            <p class="tag-message" style="margin-bottom: 6px;">1. SIGN OUT TAG</p>
            <p class="tag-message" style="margin-bottom: 6px;">2. RETURN UNWRAPPED GIFT BY 12.15.26</p>
          </div>
        </div>
        <div class="tag-footer">
          Contact GrowToGive at admin@growtogive.com. 941.216.1181
        </div>
      </div>
    `;
  };

  let totalVisibleCards = 0;
  applications.forEach((app, appIndex) => {
    const { tags } = getFamilyTags(app, appIndex);
    const filteredTags = tags.filter((tag) => {
      const currentStatus = getKidGiftStatus(tag.kid, tag.giftNumber);
      const currentLocationId = getKidGiftLocationId(tag.kid, tag.giftNumber);

      const matchesSearch = 
        tag.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.kid.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.momName && app.momName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tag.giftText.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || currentStatus === statusFilter;

      let matchesLocation = true;
      if (locationFilter === "NONE") {
        matchesLocation = !currentLocationId;
      } else if (locationFilter !== "ALL") {
        matchesLocation = currentLocationId === locationFilter;
      }

      return matchesSearch && matchesStatus && matchesLocation;
    });
    totalVisibleCards += filteredTags.length;
  });

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading Christmas Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Christmas Charity Dashboard</h1>
            <p className="text-sm text-gray-500">Manage submissions, referrals, addresses, and independent gift statuses.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePrintTags} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm">
              🖨️ Print All Gift Tags
            </button>
            <button onClick={loadData} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">
              Refresh Data
            </button>
          </div>
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

        {/* Search and Filters Bar with Reset Button */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
          <div className="w-full md:w-1/3 relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Tag ID (e.g. 11-5A), Child Name, or Family..."
              className="w-full px-3 py-2 pr-14 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <span className="absolute right-2.5 bg-sky-100 text-sky-800 text-xs font-bold px-2 py-0.5 rounded-md pointer-events-none">
              {totalVisibleCards}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="PLACED">PLACED</option>
              <option value="CLAIMED">CLAIMED</option>
              <option value="PICKED_UP">PICKED UP</option>
              <option value="WRAPPED">WRAPPED</option>
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white font-medium"
            >
              <option value="ALL">All Locations</option>
              <option value="NONE">-- No Location --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>

            {(searchQuery || statusFilter !== "ALL" || locationFilter !== "ALL") && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg border transition"
              >
                Reset Filters
              </button>
            )}
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
              applications.map((app, appIndex) => {
                const { familyNumber, tags } = getFamilyTags(app, appIndex);

                const filteredTags = tags.filter((tag) => {
                  const currentStatus = getKidGiftStatus(tag.kid, tag.giftNumber);
                  const currentLocationId = getKidGiftLocationId(tag.kid, tag.giftNumber);

                  const matchesSearch = 
                    tag.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tag.kid.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (app.momName && app.momName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    tag.giftText.toLowerCase().includes(searchQuery.toLowerCase());

                  const matchesStatus = statusFilter === "ALL" || currentStatus === statusFilter;

                  let matchesLocation = true;
                  if (locationFilter === "NONE") {
                    matchesLocation = !currentLocationId;
                  } else if (locationFilter !== "ALL") {
                    matchesLocation = currentLocationId === locationFilter;
                  }

                  return matchesSearch && matchesStatus && matchesLocation;
                });

                if (filteredTags.length === 0) return null;

                return (
                  <div key={app.id} className="p-6 space-y-4 hover:bg-gray-50/50 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Family {familyNumber}: {app.momName}
                        </h3>
                        <p className="text-xs text-gray-500">Phone: {app.phone} | Email: {app.email || "N/A"}</p>
                        <p className="text-xs text-blue-600 font-semibold mt-1">🤝 Referred By: {app.referredBy}</p>
                        <p className="text-xs text-gray-600 font-medium">📍 Address: {app.address}</p>
                        {app.donorNotes && (
                          <p className="text-xs bg-amber-50 text-amber-800 p-2 rounded mt-1 border border-amber-200">
                            <strong>Donor Note:</strong> "{app.donorNotes}"
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/christmas/apply?edit=${app.id}`}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-semibold border border-blue-200 transition"
                        >
                          ✏️ Edit Application
                        </Link>
                        
                        <button onClick={() => handleDeleteApp(app.id)} className="text-xs text-red-600 hover:text-red-800 font-semibold">
                          Delete Application
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTags.map((tag) => {
                        const currentStatus = getKidGiftStatus(tag.kid, tag.giftNumber);
                        const currentLocationId = getKidGiftLocationId(tag.kid, tag.giftNumber);

                        return (
                          <div key={`${tag.kid.id}-${tag.giftNumber}`} className="bg-white p-4 rounded-lg border shadow-xs space-y-3 relative border-l-4 border-l-red-600">
                            <div className="flex justify-between items-center border-b pb-2">
                              <span className="bg-red-600 text-white font-extrabold text-xs px-2 py-0.5 rounded">
                                Tag ID: {tag.tagId}
                              </span>
                              <span className="text-xs font-semibold text-gray-600">{tag.kid.gender} Age {tag.kid.age}</span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Child: {tag.kid.name}</p>
                              <p className="text-sm font-bold text-gray-800 mt-0.5">🎁 Gift {tag.giftNumber}: {tag.giftText}</p>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                              <button 
                                onClick={() => openEditModal(tag.kid, tag.tagId)}
                                className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded font-semibold border"
                              >
                                Edit Tag
                              </button>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t">
                              <select
                                value={currentStatus}
                                onChange={(e) => handleStatusChange(tag.kid.id, e.target.value, currentLocationId || null, tag.giftNumber)}
                                className="w-full text-xs px-2 py-1 border rounded bg-white font-medium"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="PLACED">PLACED</option>
                                <option value="CLAIMED">CLAIMED</option>
                                <option value="PICKED_UP">PICKED UP</option>
                                <option value="WRAPPED">WRAPPED</option>
                              </select>

                              <select
                                value={currentLocationId}
                                onChange={(e) => handleStatusChange(tag.kid.id, currentStatus, e.target.value || null, tag.giftNumber)}
                                className="w-full text-xs px-2 py-1 border rounded bg-white font-medium"
                              >
                                <option value="">-- No Location Assigned --</option>
                                {locations.map((loc) => (
                                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {editingKid && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Child Details</h3>
                <p className="text-xs text-gray-500">Tag Number: <span className="font-semibold text-red-600">#{editingKid.tagNumber}</span></p>
              </div>
              <button 
                onClick={() => setEditingKid(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKid} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Child Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Boy">Boy</option>
                    <option value="Girl">Girl</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Gift Idea 1</label>
                <input
                  type="text"
                  value={editForm.giftOne}
                  onChange={(e) => setEditForm({ ...editForm, giftOne: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Gift Idea 2</label>
                <input
                  type="text"
                  value={editForm.giftTwo}
                  onChange={(e) => setEditForm({ ...editForm, giftTwo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingKid(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}