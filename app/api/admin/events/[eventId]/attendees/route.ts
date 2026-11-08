import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    const userRole = (session?.user as any)?.role;
    const isAdmin = userRole && userRole.toUpperCase() === 'ADMIN';

    if (!session || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const eventId = params.eventId;

    // Fetch attendees directly using the eventId foreign key
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            userPhone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute totals with explicit type annotations for TypeScript strict mode
    const totalAttendees = attendees.length;
    const totalGuests = attendees.reduce(
      (sum: number, record: any) => sum + (Number(record.guestCount) || 0) + 1,
      0
    );
    const totalDonations = attendees.reduce(
      (sum: number, record: any) => sum + (Number(record.donationAmount) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      attendees,
      totals: {
        totalAttendees,
        totalGuests,
        totalDonations,
      },
    });
  } catch (error: any) {
    console.error('API Error in /api/admin/events/[eventId]/attendees:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    const userRole = (session?.user as any)?.role;
    const isAdmin = userRole && userRole.toUpperCase() === 'ADMIN';

    if (!session || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { attendeeId, guestCount, donationAmount, status, notes } = body;

    if (!attendeeId) {
      return NextResponse.json({ error: 'Attendee ID is required for editing.' }, { status: 400 });
    }

    // Admin editing privileges for attendee records
    const updatedAttendee = await prisma.eventAttendee.update({
      where: { id: attendeeId },
      data: {
        ...(guestCount !== undefined && { guestCount: Number(guestCount) }),
        ...(donationAmount !== undefined && { donationAmount: parseFloat(donationAmount) }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            userPhone: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Attendee record updated successfully.',
      attendee: updatedAttendee,
    });
  } catch (error: any) {
    console.error('API Error updating attendee:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}