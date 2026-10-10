import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { referrerId } = await req.json();
    if (!referrerId) {
      return NextResponse.json({ error: 'Missing referrer' }, { status: 400 });
    }

    const REWARD_AMOUNT = 1.00; // 1 GB for visit reward

    // 1. Prevent duplicate visit rewards for the same browser using cookies
    const cookieStore = await cookies();
    const visitedCookieName = `ref_visited_${referrerId}`;
    const hasVisited = cookieStore.get(visitedCookieName);

    if (hasVisited) {
      return NextResponse.json({ success: true, message: 'Visit already rewarded for this browser' });
    }

    // 2. Find the admin/growtogive account for the funding pool deduction
    const adminUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: 'admin@growtogive.com' },
          { role: 'ADMIN' },
          { role: 'admin' }
        ]
      },
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin account (GrowToGive) not found' }, { status: 500 });
    }

    // 3. Perform the atomic transaction with dual credit/debit logs (even if referrer is admin)
    await prisma.$transaction([
      // Increment referrer's Growbucks
      prisma.user.update({
        where: { id: referrerId },
        data: { growbucks: { increment: REWARD_AMOUNT } },
      }),
      // Decrement admin/growtogive account's Growbucks
      prisma.user.update({
        where: { id: adminUser.id },
        data: { growbucks: { decrement: REWARD_AMOUNT } },
      }),
      // Log transaction for referrer (Incoming credit)
      prisma.transaction.create({
        data: {
          receiverId: referrerId,
          amount: REWARD_AMOUNT,
          type: 'REFERRAL',
          reason: 'Referral link visit reward',
        },
      }),
      // Log transaction for admin (Outgoing deduction/debit)
      prisma.transaction.create({
        data: {
          senderId: adminUser.id,
          receiverId: referrerId,
          amount: REWARD_AMOUNT,
          type: 'REFERRAL',
          reason: 'for referral visit payout',
        },
      }),
    ]);

    // 4. Set a cookie so this browser cannot trigger another visit reward for this referrer (30 days)
    cookieStore.set(visitedCookieName, 'true', {
      maxAge: 30 * 24 * 60 * 60, 
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    console.log(`Successfully credited 1.00 GB visit reward to referrer: ${referrerId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Referral visit reward error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}