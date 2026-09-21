import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getPseudoHash(id: any): number {
  const strId = String(id || '1');
  let hash = 0;
  for (let i = 0; i < strId.length; i++) {
    hash = (hash << 5) - hash + strId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getListingDistance(item: any): number {
  if (item.type === 'COMMERCIAL') {
    const locKey = item.location || item.city || item.id || 'commercial';
    return (getPseudoHash(locKey) % 23) + 2;
  } else {
    const authorId = item.authorId || item.author?.id || 'user-default';
    return (getPseudoHash(authorId) % 23) + 1;
  }
}

const fallbackMockListings = [
  {
    id: '1',
    title: 'Fresh Organic Tomatoes',
    description: 'Grown in my backyard garden. Free to anyone in the community!',
    type: 'OFFER',
    priceInBucks: 0,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=60',
    authorId: 'user-1',
    author: { id: 'user-1', name: 'John Doe', churchName: 'Grace Family Church - Tampa', city: 'Tampa' },
    churchName: 'Grace Family Church - Tampa',
    city: 'Tampa',
    reviews: [],
  },
  {
    id: '2',
    title: 'Looking for a Lawn Mower',
    description: 'Need to borrow or trade for a working lawn mower this weekend.',
    type: 'REQUEST',
    priceInBucks: 5,
    imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=800&auto=format&fit=crop&q=60',
    authorId: 'user-1',
    author: { id: 'user-1', name: 'John Doe', churchName: 'Grace Family Church - Tampa', city: 'Tampa' },
    churchName: 'Grace Family Church - Tampa',
    city: 'Tampa',
    reviews: [],
  },
  {
    id: '3',
    title: 'Tampa Bay Professional Cleaning Services',
    description: 'Commercial and residential deep cleaning packages available.',
    type: 'COMMERCIAL',
    priceInBucks: 50,
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=60',
    authorId: 'user-2',
    author: { id: 'user-2', name: 'CleanCorp Pro', churchName: 'General Community', city: 'Clearwater' },
    churchName: 'General Community',
    city: 'Clearwater',
    location: '123 Business Blvd, Clearwater',
    reviews: [],
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const churchFilter = searchParams.get('church') || '';
    const maxRadius = Number(searchParams.get('radius')) || 25;

    let rawListings: any[] = [];
    try {
      rawListings = await prisma.listing.findMany({
        include: {
          author: true,
          reviews: {
            include: {
              author: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.warn('Database fetch warning, using fallback data:', dbErr);
    }

    const sourceData = rawListings.length > 0 ? rawListings : fallbackMockListings;

    const listings = sourceData
      .map((item) => {
        const authorId = item.authorId || item.author?.id || 'user-default';
        const fixedDistance = getListingDistance(item);
        const churchVal = item.churchName || item.author?.churchName || 'Grace Family Church';
        const cityVal = item.city || item.author?.city || 'Tampa';
        const authorName = item.author?.name || 'Community Member';

        // Format real database reviews and include authorId for duplicate checks
        const finalReviews = (item.reviews || []).map((r: any) => ({
          id: r.id,
          authorId: r.authorId || r.author?.id,
          author: r.author?.name || 'Community Member',
          rating: r.rating,
          date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          comment: r.comment,
        }));
        
        // Compute average rating from real reviews
        const totalRating = finalReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        const avgRating = finalReviews.length > 0 ? Number((totalRating / finalReviews.length).toFixed(1)) : 5.0;

        const seed = getPseudoHash(item.id);
        const daysInFuture = (seed % 25) + 3;
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + daysInFuture);
        const expirationDate = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return {
          id: item.id,
          title: item.title || 'Untitled',
          description: item.description || '',
          type: item.type || 'OFFER',
          category: item.category || 'GOODS',
          priceInBucks: item.priceInBucks || 0,
          imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=60',
          authorId,
          authorName,
          authorEmail: item.author?.email || `${authorName.toLowerCase().replace(/\s+/g, '')}@growtogive.org`,
          churchName: churchVal,
          city: cityVal,
          distance: fixedDistance,
          rating: avgRating,
          reviewCount: finalReviews.length,
          expirationDate,
          reviews: finalReviews,
        };
      })
      .filter((item) => {
        if (item.distance > maxRadius) return false;

        if (query) {
          const q = query.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchChurch = item.churchName.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchChurch) return false;
        }

        if (churchFilter) {
          const c = churchFilter.toLowerCase();
          const itemChurch = item.churchName.toLowerCase();
          const matches = itemChurch.includes(c) || c.includes(itemChurch);
          if (!matches) return false;
        }

        return true;
      });

    return NextResponse.json(listings, { status: 200 });
  } catch (error) {
    console.error('Marketplace API Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}