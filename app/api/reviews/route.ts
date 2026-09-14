import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rating, comment, authorId, listingId, parentId } = body;

    if (!listingId || !comment) {
      return NextResponse.json({ error: 'Missing required review fields' }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    let validAuthorId = authorId;
    if (validAuthorId) {
      const userExists = await prisma.user.findUnique({ where: { id: validAuthorId } });
      if (!userExists) validAuthorId = null;
    }

    if (!validAuthorId) {
      const fallbackUser = await prisma.user.findFirst();
      if (!fallbackUser) {
        return NextResponse.json({ error: 'No valid user found' }, { status: 400 });
      }
      validAuthorId = fallbackUser.id;
    }

    if (!parentId && listing.authorId === validAuthorId) {
      return NextResponse.json({ error: 'Authors cannot leave reviews on their own listings.' }, { status: 400 });
    }

    const reviewData: any = {
      rating: Number(rating || 5),
      comment: comment || '',
      authorId: validAuthorId,
      listingId,
    };

    if (parentId) {
      reviewData.parent = { connect: { id: parentId } };
    }

    const newReview = await prisma.review.create({
      data: reviewData,
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (error: any) {
    console.error('Review Creation Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}