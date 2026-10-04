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
      userPhone, // Added userPhone
      address,   // Added address
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with all profile attributes, phone, address, and geolocation coordinates
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        userPhone, // Saved to database
        address,   // Saved to database
        role: 'subscriber',
        city: city || 'Bradenton',
        state: state || 'FL',
        churchName: churchName || null,
        latitude: latitude ? parseFloat(latitude) : 27.4989,
        longitude: longitude ? parseFloat(longitude) : -82.5648,
        bio: bio || null,
        avatar: avatar || null,
      },
    });

    // --- REFERRAL SIGNUP BONUS PROCESSING (GB 50.00) ---
    try {
      const cookieStore = await cookies();
      const referrerId = cookieStore.get('growtogive_ref')?.value;

      if (referrerId && referrerId !== newUser.id) {
        const referrer = await prisma.user.findUnique({
          where: { id: referrerId },
        });

        if (referrer) {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: referrerId },
              data: { growbucks: { increment: 50.00 } },
            }),
            prisma.transaction.create({
              data: {
                receiverId: referrerId,
                amount: 50.00,
                type: 'REFERRAL_SIGNUP',
                reason: `Bonus for referred user signup (${newUser.email})`,
              },
            }),
          ]);

          // Clear the referral cookie
          cookieStore.set('growtogive_ref', '', { maxAge: 0, path: '/' });
        }
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