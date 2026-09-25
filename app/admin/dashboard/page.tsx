import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function AdminDashboardPage() {
  const session = await getServerSession();

  // 1. Check if authenticated and has admin role
  if (!session || (session.user as any)?.role !== 'admin') {
    redirect('/'); // Kick non-admins back home
  }

  // 2. Fetch stats or management data for the admin
  const totalUsers = await prisma.user.count();
  const totalListings = await prisma.listing.count();
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border">
      <h1 className="text-3xl font-bold mb-2 text-red-600">Admin Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome back, {session.user?.name}. You have full system management access.</p>

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
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3 text-sm font-medium text-gray-600">Name</th>
              <th className="p-3 text-sm font-medium text-gray-600">Email</th>
              <th className="p-3 text-sm font-medium text-gray-600">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3 font-semibold text-sm uppercase">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}