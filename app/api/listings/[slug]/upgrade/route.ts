// app/api/listings/[slug]/upgrade/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const identifier = resolvedParams.slug;

    if (!identifier || identifier === 'undefined' || identifier === 'null') {
      return NextResponse.json({ error: 'Listing identifier is required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the listing by slug or id fallback
    const listing = await prisma.listing.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { id: identifier },
        ],
      },
      include: { author: true },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const isAdmin = user.role?.toUpperCase() === 'ADMIN';
    const isOwner = listing.authorId === user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { upgradeType } = body; // 'FEATURED' or 'COMMERCIAL'

    if (!upgradeType || !['FEATURED', 'COMMERCIAL'].includes(upgradeType)) {
      return NextResponse.json({ error: 'Invalid upgrade type specified' }, { status: 400 });
    }

    let updatedListing;

    if (upgradeType === 'FEATURED') {
      // Extend expiration by 14 days and set isFeatured to true (fixing the math multiplication)
      const currentExpiry = new Date(listing.expiresAt || Date.now());
      const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + 14 * 24 * 60 * 60 * 1000);

      updatedListing = await prisma.listing.update({
        where: { id: listing.id },
        data: {
          isFeatured: true,
          expiresAt: newExpiry,
        },
      });
    } else if (upgradeType === 'COMMERCIAL') {
      updatedListing = await prisma.listing.update({
        where: { id: listing.id },
        data: {
          isCommercial: true,
          type: 'COMMERCIAL',
        },
      });
    }

    return NextResponse.json({ success: true, listing: updatedListing });
  } catch (error: any) {
    console.error('Upgrade listing error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}