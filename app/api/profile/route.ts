import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Precise regional coordinates helper for Florida cities fallback
function getCoordsForCity(cityName: string): { lat: number; lng: number } {
  const city = (cityName || '').toLowerCase();
  if (city.includes('bradenton')) return { lat: 27.4989, lng: -82.5748 };
  if (city.includes('tampa')) return { lat: 27.9506, lng: -82.4572 };
  if (city.includes('clearwater')) return { lat: 27.9659, lng: -82.8001 };
  if (city.includes('sarasota')) return { lat: 27.3364, lng: -82.5307 };
  if (city.includes('st. petersburg') || city.includes('saint petersburg')) return { lat: 27.7676, lng: -82.6403 };
  return { lat: 27.5000, lng: -82.5500 };
}

// GET: Fetch current user profile details, Growbucks balance, and listings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
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
      },
    });

    if (!user) {
      const defaultCity = 'Bradenton';
      const defaultCoords = getCoordsForCity(defaultCity);

      user = await prisma.user.create({
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
        },
      });
    }

    const listings = await prisma.listing.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ user, listings });
  } catch (error: any) {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}

// PUT: Update all user profile fields independently without cross-over overwrites
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, city, state, churchName, address, latitude, longitude, bio, avatar } = body;

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

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name,
        email,
        city,          // Saved independently
        state,         // Saved independently
        churchName,    // Saved independently
        address,       // Saved independently from taxonomy dropdowns
        latitude: finalLat,
        longitude: finalLng,
        bio,
        avatar,
      },
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