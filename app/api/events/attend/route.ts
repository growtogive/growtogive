import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId = (session.user as any).id;

    // Fallback: Find user by email if session ID is missing
    if (!userId && session?.user?.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (dbUser) {
        userId = dbUser.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID could not be resolved from session.' }, { status: 400 });
    }

    const body = await req.json();
    const { eventId, status } = body; // status: "ATTENDING" | "NOT_ATTENDING"

    if (!eventId || !status) {
      return NextResponse.json({ error: 'Missing eventId or status.' }, { status: 400 });
    }

    const attendee = await prisma.eventAttendee.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: { eventId, userId, status },
      include: { user: true },
    });

    return NextResponse.json({ success: true, attendee });
  } catch (error: any) {
    console.error('Event attendance error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Admin or user can remove attendance
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId = (session.user as any).id;
    const isAdmin = (session.user as any)?.role?.toUpperCase() === 'ADMIN';

    if (!userId && session?.user?.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (dbUser) {
        userId = dbUser.id;
      }
    }

    const body = await req.json();
    const { eventId, userId: targetUserId } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId.' }, { status: 400 });
    }

    // If targetUserId is provided and user is admin, delete that target's attendance. Otherwise delete current user's attendance.
    const deleteUserId = (isAdmin && targetUserId) ? targetUserId : userId;

    await prisma.eventAttendee.delete({
      where: {
        eventId_userId: { eventId, userId: deleteUserId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Event attendee delete error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}