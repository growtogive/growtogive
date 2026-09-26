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
  return { lat: 27.5000, lng: -82.5500 };
}

// 🛒 GET all listings for the marketplace
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const radiusParam = searchParams.get('radius');
    const maxRadius = radiusParam ? parseFloat(radiusParam) : 25;

    let currentUserLat: number | null = null;
    let currentUserLng: number | null = null;
    let currentUserId: string | null = null;

    if (session?.user?.email) {
      const loggedUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, latitude: true, longitude: true, city: true },
      });
      if (loggedUser) {
        currentUserId = loggedUser.id;
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

    const listings = await prisma.listing.findMany({
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true, city: true, churchName: true, latitude: true, longitude: true },
        },
        reviews: {
          include: { author: { select: { name: true, avatar: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedListings = listings.map((listing) => {
      const authorId = listing.authorId || listing.author?.id || '';
      const isAuthor = currentUserId && authorId && currentUserId === authorId;

      let distance = 1.2;
      if (isAuthor) {
        distance = 0.0;
      } else {
        const isCommercial = listing.type === 'COMMERCIAL';
        let targetLat = isCommercial ? listing.latitude : listing.author?.latitude;
        let targetLng = isCommercial ? listing.longitude : listing.author?.longitude;

        if (!targetLat || !targetLng || targetLat === 0) {
          const targetCity = isCommercial ? (listing.city || 'Clearwater') : (listing.author?.city || 'Tampa');
          const coords = getCoordsForCity(targetCity);
          targetLat = coords.lat;
          targetLng = coords.lng;
        }

        distance = calculateDistance(currentUserLat!, currentUserLng!, targetLat, targetLng);
      }

      return {
        ...listing,
        distance,
        authorName: listing.author?.name || 'Member',
      };
    });

    return NextResponse.json(enrichedListings);
  } catch (error: any) {
    console.error('Fetch marketplace listings error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// 📝 POST a new listing
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, type, category, priceInBucks, imageUrl, location, city, latitude, longitude, businessHours } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
    }

    // Enforce 1 commercial listing limit per user
    if (type === 'COMMERCIAL') {
      const existingCommercial = await prisma.listing.findFirst({
        where: { authorId: user.id, type: 'COMMERCIAL' },
      });
      if (existingCommercial) {
        return NextResponse.json(
          { error: 'You are allowed only one active commercial listing.' },
          { status: 400 }
        );
      }
    }

    const newListing = await prisma.listing.create({
      data: {
        title,
        description,
        type: type || 'OFFER',
        category: category || 'GOODS',
        priceInBucks: type === 'COMMERCIAL' ? 0 : (priceInBucks ? parseFloat(priceInBucks) : 0.00),
        imageUrl: imageUrl || null,
        location: location || null,
        city: city || user.city || 'Bradenton',
        latitude: latitude ? parseFloat(latitude) : user.latitude,
        longitude: longitude ? parseFloat(longitude) : user.longitude,
        businessHours: businessHours || null,
        authorId: user.id,
      },
    });

    return NextResponse.json({ success: true, listing: newListing }, { status: 201 });
  } catch (error: any) {
    console.error('Create listing error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}