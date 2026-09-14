import { NextResponse } from 'next/server';
import { prisma } from '../../../prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const listingId = resolvedParams.id;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        author: {
          select: { id: true, name: true, email: true, churchName: true, city: true, state: true }
        },
        reviews: {
          include: {
            author: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json(listing);
  } catch (error: any) {
    console.error('Fetch Listing Error:', error);
    return NextResponse.json({ error: 'Failed to fetch listing', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const listingId = resolvedParams.id;
    const body = await request.json();
    const {
      title,
      description,
      priceInBucks,
      imageUrl,
      videoUrl,
      websiteUrl,
      address,
      latitude,
      longitude,
      businessHours,
      userId,
    } = body;

    const existingListing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existingListing.authorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to edit this listing' }, { status: 403 });
    }

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        title,
        description,
        priceInBucks: priceInBucks !== undefined ? parseFloat(priceInBucks) : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : existingListing.imageUrl,
        videoUrl: existingListing.type === 'COMMERCIAL' ? videoUrl : null,
        websiteUrl: existingListing.type === 'COMMERCIAL' ? websiteUrl : null,
        address: existingListing.type === 'COMMERCIAL' ? address : null,
        latitude: existingListing.type === 'COMMERCIAL' && latitude ? parseFloat(latitude) : null,
        longitude: existingListing.type === 'COMMERCIAL' && longitude ? parseFloat(longitude) : null,
        businessHours: existingListing.type === 'COMMERCIAL' ? businessHours : null,
      },
    });

    return NextResponse.json(updatedListing);
  } catch (error: any) {
    console.error('Update Listing Error:', error);
    return NextResponse.json({ error: 'Failed to update listing', details: error.message }, { status: 500 });
  }
}