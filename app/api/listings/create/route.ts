import { NextResponse } from 'next/server';
import { prisma } from '../../../../prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, priceInBucks, type, imageUrl, videoUrl, websiteUrl, authorId } = body;

    if (!title || !description || priceInBucks === undefined || !authorId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'COMMERCIAL') {
      const existingCommercial = await prisma.listing.findFirst({
        where: {
          authorId,
          type: 'COMMERCIAL',
        },
      });

      if (existingCommercial) {
        return NextResponse.json(
          { error: 'Limit reached: Users may only publish one active Commercial listing.' },
          { status: 400 }
        );
      }
    }

    const expiresAt =
      type === 'COMMERCIAL'
        ? null
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        priceInBucks: parseFloat(priceInBucks),
        type,
        imageUrl: imageUrl || null,
        videoUrl: type === 'COMMERCIAL' ? videoUrl || null : null,
        websiteUrl: type === 'COMMERCIAL' ? websiteUrl || null : null,
        expiresAt,
        authorId,
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error: any) {
    console.error('Create Listing Error:', error);
    return NextResponse.json(
      { error: 'Failed to create listing', details: error.message },
      { status: 500 }
    );
  }
}