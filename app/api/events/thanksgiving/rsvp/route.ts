import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventTitle, name, email, numAttending } = body;

    if (!name || !email || !numAttending) {
      return NextResponse.json({ error: 'Missing required fields (name, email, numAttending).' }, { status: 400 });
    }

    const eventId = 'thanksgiving-2026';
    const cleanEmail = email.trim().toLowerCase();
    const guestCountValue = parseInt(numAttending) || 1;

    // 1. Ensure the parent Event record exists in the database
    await prisma.event.upsert({
      where: { id: eventId },
      update: {},
      create: {
        id: eventId,
        title: eventTitle || 'GrowToGive Thanksgiving Celebration',
        eventDate: new Date('2026-11-22T14:00:00Z'),
        location: '1920 W Beach, Bradenton, FL 34207',
      },
    });

    // 2. Find or create a user account for this guest so it satisfies userId foreign keys
    let dbUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: name.trim(),
          role: 'USER',
        },
      });
    }

    // 3. Upsert attendance including guestCount
    const attendee = await prisma.eventAttendee.upsert({
      where: { 
        eventId_userId: { eventId, userId: dbUser.id } 
      },
      update: {
        status: 'ATTENDING',
        guestCount: guestCountValue,
      },
      create: {
        eventId,
        userId: dbUser.id,
        status: 'ATTENDING',
        guestCount: guestCountValue,
      },
    });

    return NextResponse.json({ success: true, attendee });
  } catch (error: any) {
    console.error('Thanksgiving RSVP error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}