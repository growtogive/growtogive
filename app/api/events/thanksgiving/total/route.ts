import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: 'thanksgiving-2026' },
      select: { 
        guestCount: true 
      },
    });

    const total = attendees.reduce(
      (sum: number, record: any) => sum + (Number(record.guestCount) || 0),
      0
    );

    return NextResponse.json({ total });
  } catch (error: any) {
    console.error('Error fetching total attendees:', error);
    return NextResponse.json({ total: 0 }, { status: 500 });
  }
}