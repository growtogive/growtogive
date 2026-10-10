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
    const sessionEmail = session?.user?.email;

    if (!sessionEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loggedInDbUser = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true },
    });
    const loggedInUserId = loggedInDbUser?.id || null;

    const { searchParams } = new URL(req.url);
    const paramUserId = searchParams.get('userId');
    const targetUserId: string | null = paramUserId || loggedInUserId;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isOwnProfile = loggedInUserId !== null && loggedInUserId === targetUserId;

    const includeQuery: any = {
      listings: {
        include: { reviews: true },
        orderBy: { createdAt: 'desc' },
      },
      reviews: {
        include: { author: { select: { name: true } } },
      },
    };

    if (isOwnProfile) {
      includeQuery.favorites = {
        where: {
          OR: [
            { targetUserId: { not: null } },
            {
              listingId: { not: null },
              listing: { expiresAt: { gt: new Date() } },
            },
          ],
        },
        include: {
          listing: true,
          targetUser: {
            select: { id: true, name: true, email: true, avatar: true, city: true, state: true, bio: true, churchName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      };

      includeQuery.sentTx = {
        include: {
          sender: { select: { name: true, email: true } },
          receiver: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      };

      includeQuery.receivedTx = {
        include: {
          sender: { select: { name: true, email: true } },
          receiver: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      };
    }

    let foundUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: includeQuery,
    });

    if (!foundUser && isOwnProfile) {
      const defaultCity = 'Bradenton';
      const defaultCoords = getCoordsForCity(defaultCity);

      foundUser = await prisma.user.create({
        data: {
          email: sessionEmail,
          name: session.user?.name || 'Community Member',
          password: 'oauth_or_session_user',
          city: defaultCity,
          state: 'FL',
          churchName: 'Grace Family Church',
          userPhone: '(555) 000-0000',
          growbucks: 10.00,
          latitude: defaultCoords.lat,
          longitude: defaultCoords.lng,
        },
        include: includeQuery,
      });
    }

    if (!foundUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let isFavorited = false;
    if (loggedInUserId !== null && !isOwnProfile) {
      const fav = await prisma.favorite.findFirst({
        where: { userId: loggedInUserId, targetUserId: targetUserId },
      });
      isFavorited = !!fav;
    }

    return NextResponse.json({
      user: { ...foundUser, isFavorited },
      listings: foundUser.listings || [],
      favorites: isOwnProfile ? (foundUser as any).favorites || [] : [],
    });
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
      name, email, city, state, churchName, userPhone, address, 
      latitude, longitude, bio, avatar, currentPassword, newPassword, confirmPassword 
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
      name, email, city, state, churchName, userPhone, address,
      latitude: finalLat, longitude: finalLng, bio, avatar,
    };

    if (newPassword && newPassword.trim() !== '') {
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: 'New passwords do not match.' }, { status: 400 });
      }
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password.' }, { status: 400 });
      }

      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (!dbUser || !dbUser.password || dbUser.password === 'oauth_or_session_user') {
        return NextResponse.json({ error: 'Password changes are not available for this account.' }, { status: 400 });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, dbUser.password);
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;

    if (!sessionUser || sessionUser.email !== 'admin@growtogive.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');
    const body = await req.json().catch(() => ({}));
    const listingAction = body.listingAction || 'unpublish';

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const adminUser = await prisma.user.findFirst({ 
      where: { email: 'admin@growtogive.com' } 
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 403 });
    }

    if (targetUserId === adminUser.id) {
      return NextResponse.json({ error: 'Cannot delete the admin account' }, { status: 400 });
    }

    if (listingAction === 'delete') {
      await prisma.listing.deleteMany({ where: { authorId: targetUserId } as any });
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}