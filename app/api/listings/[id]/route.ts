import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const EARTH_RADIUS_MILES = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_MILES * c).toFixed(1));
}

function getCoordsForCity(cityName: string): { lat: number; lng: number } {
  const city = (cityName || '').toLowerCase();
  if (city.includes('bradenton')) return { lat: 27.4989, lng: -82.5748 };
  if (city.includes('tampa')) return { lat: 27.9506, lng: -82.4572 };
  if (city.includes('clearwater')) return { lat: 27.9659, lng: -82.8001 };
  if (city.includes('sarasota')) return { lat: 27.3364, lng: -82.5307 };
  if (city.includes('st. petersburg') || city.includes('saint petersburg')) return { lat: 27.7676, lng: -82.6403 };
  return { lat: 27.4989, lng: -82.5748 };
}

// 🛒 GET single listing by ID
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);

    let currentUserLat: number | null = null;
    let currentUserLng: number | null = null;

    if (session?.user?.email) {
      const loggedUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, latitude: true, longitude: true, city: true },
      });
      if (loggedUser) {
        if (loggedUser.latitude && loggedUser.longitude && loggedUser.latitude !== 0) {
          currentUserLat = loggedUser.latitude;
          currentUserLng = loggedUser.longitude;
        } else {
          const coords = getCoordsForCity(loggedUser.city || 'South Bradenton');
          currentUserLat = coords.lat;
          currentUserLng = coords.lng;
        }
      }
    }

    if (currentUserLat === null || currentUserLng === null) {
      const defaultCoords = getCoordsForCity('South Bradenton');
      currentUserLat = defaultCoords.lat;
      currentUserLng = defaultCoords.lng;
    }

    const listing = await prisma.listing.findUnique({
      where: { id: resolvedParams.id },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true, city: true, churchName: true, latitude: true, longitude: true }
        },
        reviews: {
          include: { author: { select: { name: true, avatar: true } } }
        }
      }
    });

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    let allReviews = listing.reviews;
    if (listing.type !== 'COMMERCIAL') {
      const userReviews = await prisma.review.findMany({
        where: { targetUserId: listing.authorId },
        include: { author: { select: { name: true, avatar: true } } }
      });
      allReviews = userReviews;
    }

    const isCommercial = listing.type === 'COMMERCIAL';
    let targetLat = isCommercial ? listing.latitude : listing.author?.latitude;
    let targetLng = isCommercial ? listing.longitude : listing.author?.longitude;

    if (!targetLat || !targetLng || targetLat === 0) {
      const targetCity = isCommercial ? (listing.city || 'Clearwater') : (listing.author?.city || 'South Bradenton');
      const coords = getCoordsForCity(targetCity);
      targetLat = coords.lat;
      targetLng = coords.lng;
    }

    const distance = calculateDistance(currentUserLat!, currentUserLng!, targetLat, targetLng);

    return NextResponse.json({
      listing: {
        ...listing,
        distance,
        reviews: allReviews
      }
    });
  } catch (error: any) {
    console.error('Fetch listing error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// 📝 PUT (Update) listing by ID with strict Commercial address validation
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const listing = await prisma.listing.findUnique({ where: { id: resolvedParams.id } });
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    const isAdmin = user.role?.toUpperCase() === 'ADMIN';
    const isOwner = listing.authorId === user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, type, category, priceInBucks, imageUrl, location, city, latitude, longitude, businessHours } = body;

    const targetType = type || listing.type;

    if (targetType === 'COMMERCIAL' && listing.type !== 'COMMERCIAL') {
      return NextResponse.json(
        { error: 'You cannot change an Offer or Request into a Commercial listing once saved.' },
        { status: 400 }
      );
    }

    // STRICT VALIDATION: Commercial listings CANNOT be saved without their own business address, lat, and long
    if (targetType === 'COMMERCIAL') {
      const finalLocation = location !== undefined ? location : listing.location;
      const finalLat = latitude !== undefined && latitude !== null ? parseFloat(latitude) : listing.latitude;
      const finalLng = longitude !== undefined && longitude !== null ? parseFloat(longitude) : listing.longitude;

      if (!finalLocation || !finalLat || !finalLng || finalLat === 0 || finalLng === 0) {
        return NextResponse.json(
          { error: 'Commercial listings require a valid business address, latitude, and longitude.' },
          { status: 400 }
        );
      }

      const existingCommercial = await prisma.listing.findFirst({
        where: { authorId: listing.authorId, type: 'COMMERCIAL', NOT: { id: resolvedParams.id } },
      });
      if (existingCommercial) {
        return NextResponse.json(
          { error: 'This user already has an active commercial listing.' },
          { status: 400 }
        );
      }
    }

    const newLat = latitude !== undefined && latitude !== null && Number(latitude) !== 0 
      ? parseFloat(latitude) 
      : listing.latitude;

    const newLng = longitude !== undefined && longitude !== null && Number(longitude) !== 0 
      ? parseFloat(longitude) 
      : listing.longitude;

    const updatedListing = await prisma.listing.update({
      where: { id: resolvedParams.id },
      data: {
        title: title ?? listing.title,
        description: description ?? listing.description,
        type: targetType,
        category: category ?? listing.category,
        priceInBucks: targetType === 'COMMERCIAL' ? 0 : (priceInBucks !== undefined ? parseFloat(priceInBucks) : listing.priceInBucks),
        imageUrl: imageUrl ?? listing.imageUrl,
        city: city ?? listing.city,
        location: targetType === 'COMMERCIAL' ? (location ?? listing.location) : null,
        latitude: targetType === 'COMMERCIAL' ? newLat : null,
        longitude: targetType === 'COMMERCIAL' ? newLng : null,
        businessHours: targetType === 'COMMERCIAL' ? (businessHours ?? listing.businessHours) : null,
        businessPhone: body.businessPhone,
        websiteUrl: body.websiteUrl,
      },
    });

    return NextResponse.json({ success: true, listing: updatedListing });
  } catch (error: any) {
    console.error('Update listing error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}

// 🗑️ DELETE listing by ID
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });

    const listing = await prisma.listing.findUnique({ where: { id: resolvedParams.id } });
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    const isAdmin = user.role?.toUpperCase() === 'ADMIN';
    const isOwner = listing.authorId === user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.listing.delete({ where: { id: resolvedParams.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete listing error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}