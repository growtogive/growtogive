import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        author: true,
        reviews: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // If it's an offer/request, also fetch reviews tied to the author's user profile targetUserId
    let profileReviews: any[] = [];
    if (listing.type !== 'COMMERCIAL') {
      profileReviews = await prisma.review.findMany({
        where: { targetUserId: listing.authorId },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Combine and deduplicate reviews
    const allReviewsMap = new Map();
    [...listing.reviews, ...profileReviews].forEach((rev) => {
      allReviewsMap.set(rev.id, {
        id: rev.id,
        author: rev.author?.name || 'Community Member',
        rating: rev.rating,
        date: new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        comment: rev.comment,
      });
    });

    const reviewsList = Array.from(allReviewsMap.values());
    const totalRating = reviewsList.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = reviewsList.length > 0 ? Number((totalRating / reviewsList.length).toFixed(1)) : 4.9;

    const formattedListing = {
      ...listing,
      authorName: listing.author?.name || 'Community Member',
      authorEmail: listing.author?.email || 'member@growtogive.org',
      churchName: listing.churchName || listing.author?.churchName || 'Grace Family Church',
      city: listing.city || listing.author?.city || 'Tampa',
      rating: avgRating,
      reviewCount: reviewsList.length,
      reviews: reviewsList, // Real reviews from DB!
    };

    return NextResponse.json(formattedListing, { status: 200 });
  } catch (err) {
    console.error('Error fetching listing detail:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}