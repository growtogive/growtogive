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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    let currentUserId: string | null = null;
    let currentUserEmail: string | undefined = undefined;
    let currentUserLat: number | null = null;
    let currentUserLng: number | null = null;

    if (session?.user?.email) {
      currentUserEmail = session.user.email.toLowerCase().trim();
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const churchFilter = searchParams.get('church') || '';
    const radiusParam = searchParams.get('radius');
    const maxRadius = radiusParam ? Number(radiusParam) : 25;

    let rawListings: any[] = [];
    try {
      rawListings = await prisma.listing.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          category: true,
          priceInBucks: true,
          imageUrl: true,
          businessHours: true,
          location: true,   // Business address for commercial listings
          latitude: true,   // Commercial coordinate for distance
          longitude: true,  // Commercial coordinate for distance
          city: true,
          authorId: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, name: true, email: true, city: true, churchName: true, latitude: true, longitude: true }
          },
          reviews: {
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.warn('Database fetch warning:', dbErr);
    }

    const listings = rawListings.map((item) => {
      const authorId = item.authorId || item.author?.id || '';
      const authorEmail = item.author?.email ? item.author.email.toLowerCase().trim() : '';
      const authorName = item.author?.name || 'Community Member';
      
      // ⛪ AUTHOR METADATA: All listings show the author's city > church
      const churchVal = item.author?.churchName || 'Grace Family Church';
      const cityVal = item.author?.city || 'South Bradenton'; 

      const isCommercial = item.type === 'COMMERCIAL' || item.type === 'SERVICE';

      // 🎯 DISTANCE CALCULATION: Commercial uses listing coords; Offers/Requests use author coords
      let targetLat: number | null = null;
      let targetLng: number | null = null;

      if (isCommercial) {
        targetLat = item.latitude;
        targetLng = item.longitude;
      } else {
        targetLat = item.author?.latitude ?? null;
        targetLng = item.author?.longitude ?? null;
      }

      if (!targetLat || !targetLng || targetLat === 0) {
        const coords = getCoordsForCity(cityVal);
        targetLat = coords.lat;
        targetLng = coords.lng;
      }

      const distance = calculateDistance(currentUserLat!, currentUserLng!, targetLat, targetLng);

      const finalReviews = (item.reviews || []).map((r: any) => ({
        id: r.id,
        authorId: r.authorId || r.author?.id,
        author: { id: r.author?.id || r.authorId, name: r.author?.name || 'Community Member' },
        rating: r.rating,
        date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        comment: r.comment,
      }));

      const totalRating = finalReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
      const avgRating = finalReviews.length > 0 ? Number((totalRating / finalReviews.length).toFixed(1)) : 5.0;

      // 📅 DATES & EXPIRATION LOGIC
      const createdDateObj = new Date(item.createdAt || Date.now());
      const createdAtFormatted = createdDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      let expirationDate: string | null = null;
      if (!isCommercial) {
        const expDate = new Date(createdDateObj);
        expDate.setDate(expDate.getDate() + 14);
        expirationDate = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      return {
        id: item.id,
        title: item.title || 'Untitled',
        description: item.description || '',
        type: item.type || 'OFFER',
        category: item.category || 'GOODS',
        priceInBucks: item.priceInBucks || 0,
        imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=60',
        businessHours: item.businessHours || null,
        location: item.location || null,
        authorId,
        authorName,
        authorEmail: authorEmail || `${authorName.toLowerCase().replace(/\s+/g, '')}@growtogive.org`,
        churchName: churchVal,
        city: cityVal,
        distance,
        rating: avgRating,
        reviewCount: finalReviews.length,
        createdAt: createdAtFormatted,
        expirationDate, // Will be null for commercial listings
        reviews: finalReviews,
      };
    }).filter((item) => {
      if (item.distance > maxRadius) return false;

      if (query) {
        const q = query.toLowerCase();
        if (!item.title.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q) && !item.churchName.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (churchFilter) {
        const c = churchFilter.toLowerCase();
        if (!item.churchName.toLowerCase().includes(c) && !c.includes(item.churchName.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    return NextResponse.json(listings, { status: 200 });
  } catch (error) {
    console.error('Marketplace API Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}