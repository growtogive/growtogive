// app/api/growbucks/transfer/route.ts (or wherever your transfer route is)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listingId, receiverId, amount, reason } = await req.json();

    if (!receiverId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid transfer details or amount.' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);

    // Get Sender
    const sender = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
    });

    if (!sender) {
      return NextResponse.json({ error: 'Sender account not found.' }, { status: 404 });
    }

    // --- SECURITY GATES ---
    if (!sender.emailVerified) {
      return NextResponse.json(
        { error: 'You must verify your email address before trading Growbucks.' },
        { status: 403 }
      );
    }

    if (!sender.basicTrainingPassed) {
      return NextResponse.json(
        { error: 'You must complete Basic Training before trading or sending Growbucks.' },
        { status: 403 }
      );
    }

    if (sender.id === receiverId) {
      return NextResponse.json({ error: 'You cannot transfer Growbucks to yourself.' }, { status: 400 });
    }

    // Check if sender has enough balance (Only admin can go negative)
    const isAdmin = sender.email.toLowerCase().trim() === 'admin@growtogive.org' || sender.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && sender.growbucks < parsedAmount) {
      return NextResponse.json(
        { error: `Insufficient Growbucks balance. You have GB ${sender.growbucks.toFixed(2)}, but tried to send GB ${parsedAmount.toFixed(2)}.` },
        { status: 400 }
      );
    }

    // Get Receiver
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver account not found.' }, { status: 404 });
    }

    // Find Admin Account
    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@growtogive.org' },
    });

    if (!adminUser) {
      adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });
    }

    // Corrected multiplication for commission and net amount
    const commission = parsedAmount * 0.10;
    const netAmount = parsedAmount * 0.90;

    // Execute Database Transaction
    await prisma.$transaction(async (tx) => {
      // 1. Decrease sender balance
      await tx.user.update({
        where: { id: sender.id },
        data: { growbucks: { decrement: parsedAmount } },
      });

      // 2. Increase receiver balance (90%)
      await tx.user.update({
        where: { id: receiver.id },
        data: { growbucks: { increment: netAmount } },
      });

      // 3. Increase admin balance (10% commission)
      if (adminUser) {
        await tx.user.update({
          where: { id: adminUser.id },
          data: { growbucks: { increment: commission } },
        });
      }

      // 4. Create Transaction Log
      await tx.transaction.create({
        data: {
          reason: reason || 'Marketplace Transfer',
          amount: parsedAmount,
          commission,
          netAmount,
          senderId: sender.id,
          receiverId: receiver.id,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Transfer completed successfully!' });
  } catch (err: any) {
    console.error('Growbucks transfer error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error during transfer.' }, { status: 500 });
  }
}