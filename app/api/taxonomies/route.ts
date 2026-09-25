import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { city: true, state: true, churchName: true },
    });

    const cityMap = new Map();
    users.forEach((u) => {
      if (u.city && u.city.trim() !== '') {
        const cityName = u.city.trim();
        const stateName = (u.state || 'FL').trim();
        const key = `${cityName}|${stateName}`;

        if (!cityMap.has(key)) {
          cityMap.set(key, { city: cityName, state: stateName, churches: new Set() });
        }
        if (u.churchName && u.churchName.trim() !== '') {
          cityMap.get(key).churches.add(u.churchName.trim());
        }
      }
    });

    const taxonomy = Array.from(cityMap.values()).map((item) => ({
      city: item.city,
      state: item.state,
      churches: Array.from(item.churches),
    }));

    return NextResponse.json(taxonomy);
  } catch (error: any) {
    console.error('Taxonomy fetch error:', error);
    return NextResponse.json({ error: 'Failed to load taxonomies' }, { status: 500 });
  }
}