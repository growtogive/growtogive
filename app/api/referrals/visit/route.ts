import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { referrerId } = await req.json();
    if (!referrerId) {
      return NextResponse.json({ error: 'Missing referrer' }, { status: 400 });
    }

    const REWARD_AMOUNT = 1.00; // Use 50.00 for the signup route

    // 1. Find the admin/growtogive account (adjust email or identifier as needed)
    const adminUser = await prisma.user.findFirst({
      where: { 
        // Example: matching by email or role. Adjust to match your DB schema.
        OR: [
          { email: 'admin@growtogive.com' },
          { role: 'ADMIN' }
        ]
      },
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin account (GrowToGive) not found' }, { status: 500 });
    }

    // Prevent rewarding self-referrals if referrer is the admin
    if (adminUser.id === referrerId) {
      return NextResponse.json({ success: true, message: 'Admin self-referral ignored' });
    }

    // 2. Perform the atomic transaction: 
    // - Increment referrer's Growbucks
    // - Decrement admin's Growbucks
    // - Create audit trail transactions for both
    await prisma.$transaction([
      // Increment referrer
      prisma.user.update({
        where: { id: referrerId },
        data: { growbucks: { increment: REWARD_AMOUNT } },
      }),
      // Decrement admin/growtogive account
      prisma.user.update({
        where: { id: adminUser.id },
        data: { growbucks: { decrement: REWARD_AMOUNT } },
      }),
      // Log transaction for referrer (Incoming)
      prisma.transaction.create({
        data: {
          receiverId: referrerId,
          amount: REWARD_AMOUNT,
          type: 'REFERRAL',
          reason: 'Referral link visit reward',
        },
      }),
      // Log transaction for admin (Outgoing/Deduction)
      prisma.transaction.create({
        data: {
          // If your Transaction model uses senderId/receiverId, adjust fields accordingly:
          senderId: adminUser.id,
          receiverId: referrerId,
          amount: REWARD_AMOUNT,
          type: 'REFERRAL',
          reason: 'for referral visit',
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Referral reward error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}