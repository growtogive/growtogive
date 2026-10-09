// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const currentUserEmail = session?.user?.email;

    let currentUserCoords = null;
    if (currentUserEmail) {
      const currentUser = await prisma.user.findUnique({
        where: { email: currentUserEmail },
        select: { latitude: true, longitude: true },
      });
      if (currentUser && currentUser.latitude && currentUser.longitude) {
        currentUserCoords = { lat: currentUser.latitude, lng: currentUser.longitude };
      }
    }

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
        latitude: true,
        longitude: true,
        createdAt: true,
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
          },
        },
      },
    });

    return NextResponse.json({ users, currentUserCoords }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' }, 
      { status: 500 }
    );
  }
}