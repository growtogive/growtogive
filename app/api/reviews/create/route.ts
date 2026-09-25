import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rating, comment, authorId, listingId } = body;

    if (!listingId || !comment) {
      return NextResponse.json({ error: 'Missing required review fields' }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Use the provided authorId, or default to 'user_mock_id'
    const targetAuthorId = authorId || 'user_mock_id';

    // Ensure the user actually exists in the database (upsert to prevent foreign key errors)
    const dbUser = await prisma.user.upsert({
      where: { id: targetAuthorId },
      update: {},
      create: {
        id: targetAuthorId,
        name: targetAuthorId === 'user_mock_id' ? 'John Doe' : 'Community Member',
        email: `${targetAuthorId}@growtogive.org`,
      },
    });

    if (listing.authorId === dbUser.id) {
      return NextResponse.json({ error: 'Authors cannot leave reviews on their own listings.' }, { status: 400 });
    }

    const newReview = await prisma.review.create({
      data: {
        rating: Number(rating || 5),
        comment: comment.trim(),
        authorId: dbUser.id,
        listingId,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (error: any) {
    console.error('Review Creation Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}