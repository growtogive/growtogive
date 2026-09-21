import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, rating, comment } = body;

    const currentUserId = 'user_mock_id';

    if (!listingId || !rating || !comment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure the mock user exists
    let mockUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!mockUser) {
      mockUser = await prisma.user.upsert({
        where: { email: 'mockuser@growtogive.org' },
        update: {},
        create: {
          id: currentUserId,
          name: 'Mock Test User',
          email: 'mockuser@growtogive.org',
        },
      });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.authorId === currentUserId) {
      return NextResponse.json({ error: 'You cannot review your own listing or profile.' }, { status: 403 });
    }

    const newReview = await prisma.review.create({
      data: {
        rating: Number(rating),
        comment: comment.trim(),
        author: { connect: { id: currentUserId } },
        listing: { connect: { id: listingId } },
        targetUser: { connect: { id: listing.authorId } },
      },
      include: {
        author: { select: { name: true } },
      },
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (err: any) {
    console.error('Error creating review:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}