import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const eventId = 'thanksgiving-2026';

    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalAttendees = attendees.length;
    const totalGuests = attendees.reduce(
      (sum, a) => sum + 1 + (Number(a.guestCount) || 0),
      0
    );

    return NextResponse.json({
      attendees,
      totals: {
        totalAttendees,
        totalGuests,
      },
    });
  } catch (error: any) {
    console.error('Admin thanksgiving fetch error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { attendeeId, guestCount } = body;

    if (!attendeeId) {
      return NextResponse.json({ error: 'Missing attendeeId' }, { status: 400 });
    }

    const updated = await prisma.eventAttendee.update({
      where: { id: attendeeId },
      data: {
        guestCount: Number(guestCount) || 0,
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    console.error('Admin thanksgiving update error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}