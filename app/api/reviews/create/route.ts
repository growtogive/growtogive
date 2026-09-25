import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rating, comment, authorId, listingId, targetUserId } = body;

    if (!comment || (!listingId && !targetUserId)) {
      return NextResponse.json({ error: 'Missing required review fields (listingId or targetUserId required).' }, { status: 400 });
    }

    const reviewerId = authorId || 'user_mock_id';
    let resolvedTargetUserId = targetUserId;

    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
      });

      if (!listing) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }

      if (listing.authorId === reviewerId) {
        return NextResponse.json({ error: 'Authors cannot leave reviews on their own listings.' }, { status: 400 });
      }

      resolvedTargetUserId = listing.authorId;
    } else {
      if (resolvedTargetUserId === reviewerId) {
        return NextResponse.json({ error: 'Users cannot leave reviews on their own profiles.' }, { status: 400 });
      }
    }

    const newReview = await prisma.review.create({
      data: {
        rating: Number(rating || 5),
        comment: comment.trim(),
        authorId: reviewerId,
        listingId: listingId || null,
        targetUserId: resolvedTargetUserId,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (error: any) {
    console.error('Review Creation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}