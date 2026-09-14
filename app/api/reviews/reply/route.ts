import { NextResponse } from 'next/server';
import { prisma } from '../../../../prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reviewId, userId, replyText } = body;

    if (!reviewId || !userId || !replyText) {
      return NextResponse.json({ error: 'Missing review reply data' }, { status: 400 });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { listing: true },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Verify user owns the listing or profile receiving the review
    const isOwner = review.listingId
      ? review.listing?.authorId === userId
      : review.recipientId === userId;

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the listing or profile owner can reply to this review.' },
        { status: 403 }
      );
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        replyText,
        replyCreatedAt: new Date(),
      },
    });

    // Notify reviewer that owner replied
    await prisma.notification.create({
      data: {
        userId: review.authorId,
        title: '💬 Response to Your Review',
        message: `The owner replied to your review: "${replyText.substring(0, 60)}..."`,
        link: review.listingId ? `/listings/${review.listingId}` : `/profile/${review.recipientId}`,
      },
    });

    return NextResponse.json(updatedReview);
  } catch (error: any) {
    console.error('Review Reply Error:', error);
    return NextResponse.json({ error: 'Failed to post reply', details: error.message }, { status: 500 });
  }
}