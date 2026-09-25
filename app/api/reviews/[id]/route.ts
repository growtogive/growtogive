import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const listing = await prisma.listing.findUnique({
      where: { id: resolvedParams.id },
      include: { author: true },
    });
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    const body = await req.json();
    const { rating, comment, reply, reviewId } = body;

    // Handle Author Reply
    if (reply !== undefined) {
      if (listing.authorId !== currentUser.id) {
        return NextResponse.json({ error: 'Only the listing author can reply to reviews.' }, { status: 403 });
      }
      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: { reply },
      });
      return NextResponse.json({ success: true, review: updatedReview });
    }

    // Block self-review
    if (listing.authorId === currentUser.id) {
      return NextResponse.json({ error: 'You cannot submit a review to your own listing.' }, { status: 400 });
    }

    const isCommercial = listing.type === 'COMMERCIAL';

    // Check for existing review by user
    const existingReview = await prisma.review.findFirst({
      where: {
        authorId: currentUser.id,
        ...(isCommercial ? { listingId: listing.id } : { targetUserId: listing.authorId }),
      },
    });

    if (existingReview) {
      const updated = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating: parseInt(rating) || existingReview.rating,
          comment: comment !== undefined ? comment : existingReview.comment,
        },
      });
      return NextResponse.json({ success: true, review: updated });
    } else {
      const newReview = await prisma.review.create({
        data: {
          rating: parseInt(rating) || 5,
          comment,
          authorId: currentUser.id,
          ...(isCommercial ? { listingId: listing.id } : { targetUserId: listing.authorId }),
        },
      });
      return NextResponse.json({ success: true, review: newReview });
    }
  } catch (error: any) {
    console.error('Review submission error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}