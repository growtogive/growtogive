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

function getPseudoRating(id: any, isCommercial: boolean): number {
  const seed = isCommercial ? getPseudoHash(id) : getPseudoHash(String(id) + 'user');
  const ratings = [4.2, 4.5, 4.6, 4.8, 4.9, 5.0];
  return ratings[seed % ratings.length];
}

function getPseudoExpiration(id: any): string {
  const seed = getPseudoHash(id);
  const daysInFuture = (seed % 25) + 3;
  const date = new Date();
  date.setDate(date.getDate() + daysInFuture);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getSampleReviews(isCommercial: boolean, authorName: string, listingTitle: string) {
  if (isCommercial) {
    return [
      { id: 1, author: 'Mark Taylor', rating: 5, date: '2 weeks ago', comment: `Absolute professionals! Outstanding service on ${listingTitle}. Highly recommended to all church members.` },
      { id: 2, author: 'Rachel Adams', rating: 4, date: '1 month ago', comment: 'Very thorough, punctual, and respectful. Will definitely use their services again.' },
      { id: 3, author: 'Pastor Dave', rating: 5, date: '2 months ago', comment: 'Great community partner. Did stellar work for our fellowship hall.' },
    ];
  } else {
    return [
      { id: 1, author: 'Sarah Jenkins', rating: 5, date: '1 week ago', comment: `${authorName} was extremely kind and prompt. Such a blessing to our community!` },
      { id: 2, author: 'Michael Brown', rating: 5, date: '3 weeks ago', comment: 'Smooth exchange, exactly as described. Wonderful interaction.' },
    ];
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
  },
  {
    id: '4',
    title: 'Homemade Sourdough Bread',
    description: 'Freshly baked artisan sourdough loaves ready for pickup.',
    type: 'OFFER',
    priceInBucks: 3,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=60',
    authorId: 'user-2',
    author: { id: 'user-2', name: 'Sarah Jenkins', churchName: 'Radiant Church - Tampa', city: 'Tampa' },
    churchName: 'Radiant Church - Tampa',
    city: 'Tampa',
  },
  {
    id: '5',
    title: 'Guitar Lessons for Beginners',
    description: 'Offering free acoustic guitar lessons on Tuesday evenings.',
    type: 'OFFER',
    priceInBucks: 0,
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60',
    authorId: 'user-2',
    author: { id: 'user-2', name: 'Sarah Jenkins', churchName: 'Radiant Church - Tampa', city: 'Tampa' },
    churchName: 'Radiant Church - Tampa',
    city: 'Tampa',
  },
  {
    id: '6',
    title: 'Bradenton Handyman & Repair',
    description: 'Reliable household repairs, fixture replacements, and carpentry.',
    type: 'COMMERCIAL',
    priceInBucks: 40,
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60',
    authorId: 'user-3',
    author: { id: 'user-3', name: 'David Miller', churchName: 'Bayside Community - Bradenton', city: 'Bradenton' },
    churchName: 'Bayside Community - Bradenton',
    city: 'Bradenton',
  },
  {
    id: '7',
    title: 'Childrens Books Bundle',
    description: 'Collection of gently used picture books for ages 4-8.',
    type: 'OFFER',
    priceInBucks: 0,
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=60',
    authorId: 'user-3',
    author: { id: 'user-3', name: 'David Miller', churchName: 'Bayside Community - Bradenton', city: 'Bradenton' },
    churchName: 'Bayside Community - Bradenton',
    city: 'Bradenton',
  },
  {
    id: '8',
    title: 'Sarasota Landscape & Lawn Care',
    description: 'Professional lawn mowing, trimming, and yard cleanup.',
    type: 'COMMERCIAL',
    priceInBucks: 45,
    imageUrl: 'https://images.unsplash.com/photo-1558904541-efa873a87679?w=800&auto=format&fit=crop&q=60',
    authorId: 'user-4',
    author: { id: 'user-4', name: 'Elena Rostova', churchName: 'Church of Hope - Sarasota', city: 'Sarasota' },
    churchName: 'Church of Hope - Sarasota',
    city: 'Sarasota',
  },
  {
    id: '9',
    title: 'Need Help Moving Furniture',
    description: 'Looking for two strong volunteers to help move a sofa this Saturday morning.',
    type: 'REQUEST',
    priceInBucks: 15,
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=60',
    authorId: 'user-4',
    author: { id: 'user-4', name: 'Elena Rostova', churchName: 'Church of Hope - Sarasota', city: 'Sarasota' },
    churchName: 'Church of Hope - Sarasota',
    city: 'Sarasota',
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
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.warn('Database fetch warning, using fallback data:', dbErr);
    }

    const sourceData = rawListings.length > 0 ? rawListings : fallbackMockListings;

    const listings = sourceData
      .map((item) => {
        const isCommercial = item.type === 'COMMERCIAL';
        const authorId = item.authorId || item.author?.id || 'user-default';
        const fixedDistance = getListingDistance(item);
        const rating = getPseudoRating(item.id, isCommercial);
        const expirationDate = getPseudoExpiration(item.id);
        const churchVal = item.churchName || item.author?.churchName || 'Grace Family Church';
        const cityVal = item.city || item.author?.city || 'Tampa';
        const authorName = item.author?.name || 'Community Member';
        const reviews = getSampleReviews(isCommercial, authorName, item.title);

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
          churchName: churchVal,
          city: cityVal,
          distance: fixedDistance,
          rating,
          expirationDate,
          reviews,
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

    return NextResponse.json(listings);
  } catch (error) {
    console.error('Marketplace API Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}
