// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

// Helper function to reverse geocode lat/lng to get the official Google address city & state
async function getCityAndStateFromLatLng(lat: number, lng: number) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { city: null, state: null };

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      let city: string | null = null;
      let state: string | null = null;

      const addressComponents = data.results[0].address_components;
      for (const component of addressComponents) {
        if (component.types.includes('locality')) {
          city = component.long_name;
        } else if (!city && component.types.includes('sublocality_level_1')) {
          city = component.long_name;
        } else if (!city && component.types.includes('administrative_area_level_2')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.short_name; // e.g. "FL"
        }
      }
      return { city, state };
    }
  } catch (err) {
    console.error('Error reverse geocoding lat/lng:', err);
  }
  return { city: null, state: null };
}

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

    if (!name || !email || !password || !userPhone || !address || !bio) {
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

    // --- PARSE COORDINATES & FETCH GOOGLE ADDRESS CITY/STATE ---
    const parsedLat = latitude ? parseFloat(latitude) : 27.4989;
    const parsedLng = longitude ? parseFloat(longitude) : -82.5648;

    // Derive city and state directly from the Google address coordinates
    const googleLocation = await getCityAndStateFromLatLng(parsedLat, parsedLng);
    const finalCity = googleLocation.city || city || null;
    const finalState = googleLocation.state || state || null;

    // --- FETCH REFERRER FROM COOKIE (if present) ---
    const cookieStore = await cookies();
    const rawReferrerId = cookieStore.get('growtogive_ref')?.value;
    
    console.log('Signup Debug - Raw Referrer ID from Cookie:', rawReferrerId);

    // Validate that referrer exists and isn't self-referencing
    let validReferrerId: string | null = null;
    if (rawReferrerId) {
      const referrerCheck = await prisma.user.findUnique({
        where: { id: rawReferrerId },
      });
      if (referrerCheck) {
        validReferrerId = referrerCheck.id;
        console.log('Signup Debug - Valid Referrer Found:', referrerCheck.email);
      } else {
        console.log('Signup Debug - Referrer ID in cookie not found in DB:', rawReferrerId);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with Google-derived city/state and lat/lng
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        userPhone, 
        address,   
        role: 'Subscriber',
        city: finalCity,
        state: finalState,
        churchName: churchName || null,
        latitude: parsedLat,
        longitude: parsedLng,
        bio: bio || null,
        avatar: avatar || null,
        referredById: validReferrerId, // Links user to their referrer!
      },
    });

    // --- REFERRAL SIGNUP BONUS PROCESSING (GB 50.00) ---
    try {
      if (validReferrerId && validReferrerId !== newUser.id) {
        // 1. Check if this email has EVER claimed a signup bonus before
        const existingLog = await prisma.referralLog.findUnique({
          where: { referredEmail: normalizedEmail },
        });

        // 2. Find the admin/growtogive account for the deduction
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
          console.warn('Referral Warning: Admin account not found for Growbucks deduction.');
        }

        // Only process if no prior log exists for this email and admin exists
        if (!existingLog && adminUser) {
          await prisma.$transaction([
            // Increment referrer's Growbucks balance cache
            prisma.user.update({
              where: { id: validReferrerId },
              data: { growbucks: { increment: 50.00 } },
            }),
            // Decrement admin/growtogive account's Growbucks balance cache
            prisma.user.update({
              where: { id: adminUser.id },
              data: { growbucks: { decrement: 50.00 } },
            }),
            // Transaction log 1: Credit to Referrer
            prisma.transaction.create({
              data: {
                senderId: adminUser.id,
                receiverId: validReferrerId,
                amount: 50.00,
                type: 'REFERRAL',
                reason: `Bonus for referred user signup (${newUser.email})`,
              },
            }),
            // Transaction log 2: Debit from Admin
            prisma.transaction.create({
              data: {
                senderId: adminUser.id,
                receiverId: adminUser.id,
                amount: -50.00,
                type: 'REFERRAL',
                reason: `Referral signup payout to user for (${newUser.email})`,
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

          console.log('Referral successfully processed with corrected transaction logs.');
        } else {
          console.log('Referral skipped:', { existingLog: !!existingLog, adminFound: !!adminUser });
        }

        // Clear the referral cookie
        cookieStore.set('growtogive_ref', '', { maxAge: 0, path: '/' });
      }
    } catch (refError) {
      console.error('CRITICAL Referral signup reward error:', refError);
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