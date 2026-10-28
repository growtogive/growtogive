import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { referrerId } = await req.json();
    if (!referrerId) {
      return NextResponse.json({ error: 'Missing referrer' }, { status: 400 });
    }

    // Set the referral cookie for future signup attribution (30 days)
    const cookieStore = await cookies();
    cookieStore.set('growtogive_ref', referrerId, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    console.log(`Referral cookie set for signup attribution. Referrer: ${referrerId} (Visit payout removed)`);
    return NextResponse.json({ success: true, message: 'Visit tracked for attribution' });
  } catch (error) {
    console.error('Referral visit tracking error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}