// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Adjust this import if your prisma client is located elsewhere

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        city: true,
        state: true,
        churchName: true,
        bio: true,
        createdAt: true,
        reviews: true,
        // --- ADDED REFERRAL TRACKING DATA ---
        referrer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        referrals: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}