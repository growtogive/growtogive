import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, name, email, numAttending } = body;

    if (!name || !email || !numAttending) {
      return NextResponse.json(
        { error: 'Name, email, and number attending are required.' },
        { status: 400 }
      );
    }

    const targetEventId = eventId || 'thanksgiving-2026';
    const guestCountNum = Number(numAttending) || 1;

    // Direct creation using your new schema fields - no User table lookup needed!
    const attendee = await prisma.eventAttendee.create({
      data: {
        eventId: targetEventId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        guestCount: guestCountNum,
        status: 'ATTENDING',
      },
    });

    return NextResponse.json({ success: true, attendee });
  } catch (error: any) {
    console.error('Error saving RSVP:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit RSVP. Please try again.' },
      { status: 500 }
    );
  }
}