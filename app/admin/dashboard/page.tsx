import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  const userRole = (session?.user as any)?.role?.toLowerCase();
  
  if (!session || userRole !== 'admin') {
    redirect('/'); 
  }

  let totalUsers = 0;
  let totalListings = 0;
  let users: any[] = [];

  try {
    totalUsers = await prisma.user.count();
    totalListings = await prisma.listing.count();
    
    // Fetch users including referredById safely
    const rawUsers = await prisma.user.findMany({ 
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        growbucks: true,
        createdAt: true,
        referredById: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch potential referrers in a single batch to map names cleanly
    const referrerIds = Array.from(new Set(rawUsers.map(u => u.referredById).filter(Boolean)));
    const referrers = referrerIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: referrerIds as string[] } },
      select: { id: true, name: true, email: true }
    }) : [];

    const referrerMap = new Map(referrers.map(r => [r.id, r]));

    users = rawUsers.map(u => ({
      ...u,
      referrer: u.referredById ? referrerMap.get(u.referredById) : null
    }));

  } catch (dbError) {
    console.error('Admin dashboard database fetch error:', dbError);
  }

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border">
      <h1 className="text-3xl font-bold mb-2 text-red-600">Admin Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome back, {session.user?.name || 'Admin'}. You have full system management access.</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-gray-50 border rounded-lg">
          <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
          <p className="text-2xl font-bold">{totalUsers}</p>
        </div>
        <div className="p-4 bg-gray-50 border rounded-lg">
          <h3 className="text-sm font-medium text-gray-500">Total Listings</h3>
          <p className="text-2xl font-bold">{totalListings}</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Registered Users</h2>
      <div className="border rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3 text-sm font-medium text-gray-600">Name</th>
              <th className="p-3 text-sm font-medium text-gray-600">Email</th>
              <th className="p-3 text-sm font-medium text-gray-600">Role</th>
              <th className="p-3 text-sm font-medium text-gray-600">Referred By</th>
              <th className="p-3 text-sm font-medium text-gray-600">Growbucks</th>
              <th className="p-3 text-sm font-medium text-gray-600">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">No users found or error loading records.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{u.name || 'No Name'}</td>
                  <td className="p-3 text-gray-600">{u.email}</td>
                  <td className="p-3 font-semibold text-xs uppercase">
                    <span className={`px-2 py-1 rounded ${String(u.role).toLowerCase() === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {u.referrer ? (
                      <div>
                        <span className="font-medium text-slate-900">{u.referrer.name || 'Unnamed'}</span>
                        <span className="block text-xs text-gray-400">{u.referrer.email}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Direct / None</span>
                    )}
                  </td>
                  <td className="p-3 font-bold text-green-600">{(u.growbucks || 0).toFixed(2)} GB</td>
                  <td className="p-3 text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}