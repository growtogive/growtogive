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

    const listings = await prisma.listing.findMany({
      include: {
        author: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            avatar: true, 
            city: true, 
            churchName: true, 
            latitude: true, 
            longitude: true 
          },
        },
        reviews: {
          include: { author: { select: { name: true, avatar: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedListings = listings.map((listing) => {
      const isCommercial = listing.type === 'COMMERCIAL' || listing.isCommercial;
      
      let targetLat: number | null = null;
      let targetLng: number | null = null;

      if (isCommercial) {
        targetLat = listing.latitude;
        targetLng = listing.longitude;

        if (!targetLat || !targetLng || targetLat === 0) {
          const coords = getCoordsForCity(listing.city || 'Clearwater');
          targetLat = coords.lat;
          targetLng = coords.lng;
        }
      } else {
        targetLat = listing.author?.latitude;
        targetLng = listing.author?.longitude;

        if (!targetLat || !targetLng || targetLat === 0) {
          const coords = getCoordsForCity(listing.author?.city || 'Tampa');
          targetLat = coords.lat;
          targetLng = coords.lng;
        }
      }

      const distance = calculateDistance(currentUserLat!, currentUserLng!, targetLat!, targetLng!);

      return {
        ...listing,
        distance,
        authorName: listing.author?.name || 'Member',
      };
    });

    return NextResponse.json(enrichedListings);
  } catch (error: any) {
    console.error('Fetch marketplace listings error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
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

    // --- BASIC TRAINING GATE CHECK ---
    if (!user.basicTrainingPassed) {
      return NextResponse.json(
        { error: 'You must complete Basic Training before creating listings or trading Growbucks.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, description, type, category, priceInBucks, imageUrl, location, city, latitude, longitude, businessHours, businessPhone, websiteUrl } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
    }

    const listingType = type || 'OFFER';

    if (listingType === 'COMMERCIAL') {
      if (!location || !latitude || !longitude || Number(latitude) === 0 || Number(longitude) === 0) {
        return NextResponse.json(
          { error: 'Commercial listings require a business address with valid latitude and longitude.' },
          { status: 400 }
        );
      }

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

    const listingCity = city || user.city || 'Bradenton';

    let listingLat: number;
    let listingLng: number;

    if (listingType === 'COMMERCIAL') {
      listingLat = parseFloat(latitude);
      listingLng = parseFloat(longitude);
    } else {
      listingLat = latitude ? parseFloat(latitude) : (user.latitude ?? 27.4989);
      listingLng = longitude ? parseFloat(longitude) : (user.longitude ?? -82.5748);
    }

    const newListing = await prisma.listing.create({
      data: {
        title,
        description,
        type: listingType,
        category: category || 'GOODS',
        priceInBucks: listingType === 'COMMERCIAL' ? 0 : (priceInBucks ? parseFloat(priceInBucks) : 0.00),
        imageUrl: imageUrl || null,
        location: location || null,
        city: listingCity,
        latitude: listingLat,
        longitude: listingLng,
        businessHours: businessHours || null,
        businessPhone: businessPhone || null,
        websiteUrl: websiteUrl || null,
        authorId: user.id,
      },
    });

    return NextResponse.json({ success: true, listing: newListing }, { status: 201 });
  } catch (error: any) {
    console.error('Create listing error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}