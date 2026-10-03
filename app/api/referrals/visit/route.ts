import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { referrerId } = await req.json();
    if (!referrerId) return NextResponse.json({ error: 'Missing referrer' }, { status: 400 });

    // Award GB 1.00 and log to your existing Transaction model
    await prisma.$transaction([
      prisma.user.update({
        where: { id: referrerId },
        data: { growbucks: { increment: 1.00 } },
      }),
      prisma.transaction.create({
        data: {
          receiverId: referrerId,
          amount: 1.00,
          type: 'REFERRAL_VISIT',
          reason: 'Referral link visit reward',
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}