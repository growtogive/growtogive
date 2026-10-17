import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { upgradeType } = body; // 'FEATURED' or 'COMMERCIAL'

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const userEmail = session.user.email?.toLowerCase();
    const isAuthor = listing.author?.email?.toLowerCase() === userEmail;
    const isAdmin = (session.user as any)?.role?.toUpperCase() === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (upgradeType === 'FEATURED') {
      const newExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // +14 days
      const updated = await prisma.listing.update({
        where: { id },
        data: {
          isFeatured: true,
          expiresAt: newExpiresAt,
        },
      });
      return NextResponse.json({ success: true, listing: updated });
    }

    if (upgradeType === 'COMMERCIAL') {
      const updated = await prisma.listing.update({
        where: { id },
        data: {
          type: 'COMMERCIAL',
          isCommercial: true,
        },
      });
      return NextResponse.json({ success: true, listing: updated });
    }

    return NextResponse.json({ error: 'Invalid upgrade type' }, { status: 400 });
  } catch (err: any) {
    console.error('Upgrade error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}