// app/api/profile/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

function getCoordsForCity(cityName: string): { lat: number; lng: number } {
  const city = (cityName || '').toLowerCase();
  if (city.includes('bradenton')) return { lat: 27.4989, lng: -82.5748 };
  if (city.includes('tampa')) return { lat: 27.9506, lng: -82.4572 };
  if (city.includes('clearwater')) return { lat: 27.9659, lng: -82.8001 };
  if (city.includes('sarasota')) return { lat: 27.3364, lng: -82.5307 };
  if (city.includes('st. petersburg') || city.includes('saint petersburg')) return { lat: 27.7676, lng: -82.6403 };
  return { lat: 27.5000, lng: -82.5500 };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let queryCondition = { email: session.user.email };
    if (userId) {
      queryCondition = { id: userId } as any;
    }

    let user = await (prisma as any).user.findUnique({
      where: queryCondition,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        city: true,
        state: true,
        churchName: true,
        address: true,
        latitude: true,
        longitude: true,
        bio: true,
        avatar: true,
        growbucks: true,
        createdAt: true,
        reviews: true, // <--- ADDED: Explicitly includes author reviews relation
        sentTx: {
          include: {
            sender: { select: { name: true, email: true } },
            receiver: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        receivedTx: {
          include: {
            sender: { select: { name: true, email: true } },
            receiver: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user && userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user) {
      const defaultCity = 'Bradenton';
      const defaultCoords = getCoordsForCity(defaultCity);

      user = await (prisma as any).user.create({
        data: {
          email: session.user.email,
          name: session.user.name || 'Community Member',
          password: 'oauth_or_session_user',
          city: defaultCity,
          state: 'FL',
          churchName: 'Grace Family Church',
          growbucks: 10.00,
          latitude: defaultCoords.lat,
          longitude: defaultCoords.lng,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          city: true,
          state: true,
          churchName: true,
          address: true,
          latitude: true,
          longitude: true,
          bio: true,
          avatar: true,
          growbucks: true,
          createdAt: true,
          reviews: true,
        },
      });
    }

    const listings = await prisma.listing.findMany({
      where: { authorId: user.id },
      include: {
        reviews: true, // <--- ADDED: Include listing reviews so commercial reviews follow the listing properly
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ user, listings });
  } catch (error: any) {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      name, 
      email, 
      city, 
      state, 
      churchName, 
      address, 
      latitude, 
      longitude, 
      bio, 
      avatar, 
      currentPassword, 
      newPassword, 
      confirmPassword 
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    let finalLat = latitude !== '' && latitude !== null && latitude !== undefined ? parseFloat(latitude) : null;
    let finalLng = longitude !== '' && longitude !== null && longitude !== undefined ? parseFloat(longitude) : null;

    if (!finalLat || !finalLng || finalLat === 0) {
      const coords = getCoordsForCity(city || 'Bradenton');
      finalLat = coords.lat;
      finalLng = coords.lng;
    }

    let updateData: any = {
      name,
      email,
      city,
      state,
      churchName,
      address,
      latitude: finalLat,
      longitude: finalLng,
      bio,
      avatar,
    };

    if (newPassword && newPassword.trim() !== '') {
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: 'New passwords do not match.' }, { status: 400 });
      }
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password.' }, { status: 400 });
      }

      const dbUser = await (prisma as any).user.findUnique({ where: { email: session.user.email } });
      if (!dbUser) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      if (!dbUser.password || dbUser.password === 'oauth_or_session_user') {
        return NextResponse.json({ error: 'Password changes are not available for social login accounts.' }, { status: 400 });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, dbUser.password);
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await (prisma as any).user.update({
      where: { email: session.user.email },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}