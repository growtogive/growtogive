import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 1. Securely check the session (NextAuth automatically finds your config)
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'You must be logged in to leave a review.' },
        { status: 401 }
      );
    }

    // 2. Look up the verified user in the database using their session email
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User account not found.' },
        { status: 404 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { rating, comment, listingId } = body;

    if (!listingId || !comment) {
      return NextResponse.json(
        { error: 'Missing required review fields (listingId or comment).' },
        { status: 400 }
      );
    }

    // 4. Verify the listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found.' },
        { status: 404 }
      );
    }

    // 🛑 5. BULLETPROOF SELF-REVIEW BLOCK
    if (listing.authorId === dbUser.id) {
      return NextResponse.json(
        { error: 'Authors cannot leave reviews on their own listings.' },
        { status: 400 }
      );
    }

    // 6. Create the review
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
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}