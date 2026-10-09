// app/api/signup/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      name, 
      email, 
      password, 
      userPhone, 
      address,   
      city, 
      state, 
      churchName, 
      latitude, 
      longitude, 
      bio, 
      avatar,
      website // Honeypot field
    } = body;

    // --- HONEYPOT CHECK ---
    if (website && website.trim() !== '') {
      return NextResponse.json(
        { message: 'Account created successfully!' },
        { status: 201 }
      );
    }

    if (!name || !email || !password || !userPhone || !address || !city || !bio) {
      return NextResponse.json(
        { error: 'Please fill out all required fields.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    // --- FETCH REFERRER FROM COOKIE (if present) ---
    const cookieStore = await cookies();
    const rawReferrerId = cookieStore.get('growtogive_ref')?.value;
    
    // Validate that referrer exists and isn't self-referencing
    let validReferrerId: string | null = null;
    if (rawReferrerId) {
      const referrerCheck = await prisma.user.findUnique({
        where: { id: rawReferrerId },
      });
      if (referrerCheck) {
        validReferrerId = referrerCheck.id;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with all profile attributes AND the referredById link
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        userPhone, 
        address,   
        role: 'Subscriber',
        city: city || null,
        state: state || null,
        churchName: churchName || null,
        latitude: latitude ? parseFloat(latitude) : 27.4989,
        longitude: longitude ? parseFloat(longitude) : -82.5648,
        bio: bio || null,
        avatar: avatar || null,
        referredById: validReferrerId, // Links user to their referrer!
      },
    });

    // --- REFERRAL SIGNUP BONUS PROCESSING (GB 50.00) ---
    try {
      if (validReferrerId && validReferrerId !== newUser.id) {
        // 1. Check if this email has EVER claimed a signup bonus before (survives account deletion)
        const existingLog = await prisma.referralLog.findUnique({
          where: { referredEmail: normalizedEmail },
        });

        // 2. Find the admin/growtogive account for the deduction
        const adminUser = await prisma.user.findFirst({
          where: { 
            OR: [
              { email: 'admin@growtogive.com' },
              { role: 'ADMIN' }
            ]
          },
        });

        // Only process if no prior log exists for this email and admin exists
        if (!existingLog && adminUser && adminUser.id !== validReferrerId) {
          await prisma.$transaction([
            // Increment referrer's Growbucks
            prisma.user.update({
              where: { id: validReferrerId },
              data: { growbucks: { increment: 50.00 } },
            }),
            // Decrement admin/growtogive account's Growbucks
            prisma.user.update({
              where: { id: adminUser.id },
              data: { growbucks: { decrement: 50.00 } },
            }),
            // Transaction log for referrer (Incoming reward)
            prisma.transaction.create({
              data: {
                receiverId: validReferrerId,
                amount: 50.00,
                type: 'REFERRAL',
                reason: `Bonus for referred user signup (${newUser.email})`,
              },
            }),
            // Transaction log for admin (Outgoing deduction)
            prisma.transaction.create({
              data: {
                senderId: adminUser.id,
                receiverId: validReferrerId,
                amount: 50.00,
                type: 'REFERRAL',
                reason: `referral signup (${newUser.email})`,
              },
            }),
            // Permanently lock this email out from ever triggering another signup bonus
            prisma.referralLog.create({
              data: {
                referrerId: validReferrerId,
                referredEmail: normalizedEmail,
              },
            }),
          ]);
        }

        // Clear the referral cookie
        cookieStore.set('growtogive_ref', '', { maxAge: 0, path: '/' });
      }
    } catch (refError) {
      console.error('Referral signup reward error:', refError);
    }

    return NextResponse.json(
      { message: 'Account created successfully!', userId: newUser.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}