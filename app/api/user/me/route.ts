import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    let user = null;
    try {
      user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'test@growtogive.local',
            name: 'James Test User',
            city: 'Bayshore Gardens',
            state: 'FL',
            churchName: 'Grace Community Church',
            latitude: 27.4989,
            longitude: -82.5748,
            searchRadiusMiles: 25,
          },
        });
      }
    } catch (dbError) {
      console.warn('Database connection warning, using fallback user profile:', dbError);
      user = {
        id: 'fallback-user-id',
        email: 'test@growtogive.local',
        name: 'James Test User',
        city: 'Bayshore Gardens',
        state: 'FL',
        churchName: 'Grace Community Church',
        latitude: 27.4989,
        longitude: -82.5748,
        searchRadiusMiles: 25,
      };
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('API /user/me Error:', error);
    return NextResponse.json({
      id: 'fallback-user-id',
      email: 'test@growtogive.local',
      name: 'James Test User',
      city: 'Bayshore Gardens',
      state: 'FL',
      churchName: 'Grace Community Church',
      latitude: 27.4989,
      longitude: -82.5748,
      searchRadiusMiles: 25,
    });
  }
}