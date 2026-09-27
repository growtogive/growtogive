import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const listingId = resolvedParams.id;
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    const body = await req.json();
    const { rating, comment, reviewId, reply } = body;

    // Handle Author Reply
    if (reviewId && reply !== undefined) {
      if (listing.authorId !== user.id) {
        return NextResponse.json({ error: 'Only the listing author can reply.' }, { status: 403 });
      }
      const updated = await prisma.review.update({
        where: { id: reviewId },
        data: { reply },
      });
      return NextResponse.json({ success: true, review: updated });
    }

    // Handle New Review submission
    if (!comment || rating === undefined) {
      return NextResponse.json({ error: 'Missing rating or comment.' }, { status: 400 });
    }

    if (listing.authorId === user.id) {
      return NextResponse.json({ error: 'You cannot review your own listing.' }, { status: 400 });
    }

    // Check if user already reviewed this listing
    const existingReview = await prisma.review.findFirst({
      where: { authorId: user.id, listingId: listing.id },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this listing. You can edit your existing review instead.' },
        { status: 400 }
      );
    }

    const review = await prisma.review.create({
      data: {
        rating: Number(rating),
        comment,
        authorId: user.id,
        targetUserId: listing.authorId,
        listingId: listing.id,
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error('Review post error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { reviewId, rating, comment } = body;

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required for updating.' }, { status: 400 });
    }

    const existingReview = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!existingReview) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    if (existingReview.authorId !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own reviews.' }, { status: 403 });
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: rating !== undefined ? Number(rating) : existingReview.rating,
        comment: comment !== undefined ? comment : existingReview.comment,
      },
    });

    return NextResponse.json({ success: true, review: updatedReview });
  } catch (error: any) {
    console.error('Review update error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}