import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { upgradeType } = body; // 'FEATURED' or 'COMMERCIAL'

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const userEmail = session.user.email?.toLowerCase()?.trim();
    const userRole = (session.user as any).role?.toUpperCase();
    const isAdmin = userRole === 'ADMIN';
    const isAuthor = listing.author?.email?.toLowerCase()?.trim() === userEmail;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let updateData: any = {};

    if (upgradeType === 'FEATURED') {
      const currentExpiry = new Date(listing.expiresAt || Date.now());
      const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + (14 * 24 * 60 * 60 * 1000));
      
      updateData = {
        isFeatured: true,
        expiresAt: newExpiry,
      };
    } else if (upgradeType === 'COMMERCIAL') {
      updateData = {
        isCommercial: true,
        type: 'COMMERCIAL',
        isFeatured: true,
      };
    } else {
      return NextResponse.json({ error: 'Invalid upgrade type' }, { status: 400 });
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, listing: updatedListing });
  } catch (error: any) {
    console.error('Upgrade error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}