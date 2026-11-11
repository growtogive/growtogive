import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const attendees = await prisma.eventAttendee.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalRecords = attendees.length;
    
    // Sums the guestCount directly from each record
    const totalGuests = attendees.reduce((sum: number, a: any) => {
      return sum + (Number(a.guestCount) || 0);
    }, 0);

    return NextResponse.json({
      attendees,
      totals: { 
        totalAttendees: totalRecords, // Total number of RSVP submissions
        totalGuests                   // Total sum of people from guestCount
      },
    });
  } catch (error: any) {
    console.error('Error fetching Thanksgiving attendees:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch attendees' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { attendeeId, guestCount } = body;

    if (!attendeeId) {
      return NextResponse.json({ error: 'Attendee ID is required' }, { status: 400 });
    }

    const updated = await prisma.eventAttendee.update({
      where: { id: attendeeId },
      data: { guestCount: Number(guestCount) || 0 },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    console.error('Error updating Thanksgiving attendee:', error);
    return NextResponse.json({ error: error.message || 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { attendeeId } = body;

    if (!attendeeId) {
      return NextResponse.json({ error: 'Attendee ID is required' }, { status: 400 });
    }

    await prisma.eventAttendee.delete({
      where: { id: attendeeId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting Thanksgiving attendee:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete record' }, { status: 500 });
  }
}