import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch messages for the logged-in user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = (session.user as any).email;
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Periodic cleanup for commercial listing messages older than 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.message.deleteMany({
      where: {
        createdAt: { lt: oneWeekAgo },
        listing: { type: 'COMMERCIAL' },
      },
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: user.id },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        listing: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sentMessages = await prisma.message.findMany({
      where: { senderId: user.id },
      include: {
        receiver: { select: { id: true, name: true, email: true, avatar: true } },
        listing: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = receivedMessages.filter((m: any) => !m.isRead).length;

    return NextResponse.json({ received: receivedMessages, sent: sentMessages, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch messages.' }, { status: 500 });
  }
}

// POST: Send a new message
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listingId, receiverId, content } = await req.json();
    if (!listingId || !receiverId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const senderEmail = (session.user as any).email;
    const sender = await prisma.user.findUnique({ where: { email: senderEmail } });
    if (!sender) return NextResponse.json({ error: 'Sender not found.' }, { status: 404 });

    if (sender.id === receiverId) {
      return NextResponse.json({ error: 'You cannot message yourself.' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        listingId,
        senderId: sender.id,
        receiverId,
        content: content.trim(),
      },
      include: {
        receiver: true,
        sender: true,
        listing: true,
      },
    });

    // TODO: Setup email client / nodemailer when ready

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send message.' }, { status: 500 });
  }
}

// PUT: Mark messages as read
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userEmail = (session.user as any).email;
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await prisma.message.updateMany({
      where: { receiverId: user.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}