import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.listing.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Admin Account
  const hashedPassword = await bcrypt.hash('SecureAdminPassword123!', 10);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Site Administrator',
      email: 'admin@growtogive.com',
      password: hashedPassword,
      role: 'admin',
      city: 'Bradenton',
      state: 'FL',
      churchName: 'GrowToGive Admin',
    },
  });

  // 2. Create Sample Community Users (defaulting to subscriber role)
  const user1 = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'subscriber',
      city: 'Tampa',
      state: 'FL',
      churchName: 'Grace Family Church - Tampa',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins',
      email: 'sarah@example.com',
      role: 'subscriber',
      city: 'Tampa',
      state: 'FL',
      churchName: 'Radiant Church - Tampa',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      name: 'David Miller',
      email: 'david@example.com',
      role: 'subscriber',
      city: 'Bradenton',
      state: 'FL',
      churchName: 'Bayside Community - Bradenton',
    },
  });

  const user4 = await prisma.user.create({
    data: {
      name: 'Elena Rostova',
      email: 'elena@example.com',
      role: 'subscriber',
      city: 'Sarasota',
      state: 'FL',
      churchName: 'Church of Hope - Sarasota',
    },
  });

  // 3. Create Sample Listings
  await prisma.listing.createMany({
    data: [
      {
        title: 'Fresh Organic Tomatoes',
        description: 'Grown in my backyard garden. Free to anyone in the community!',
        type: 'OFFER',
        category: 'Food & Garden',
        priceInBucks: 0,
        imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=60',
        authorId: user1.id,
      },
      {
        title: 'Looking for a Lawn Mower',
        description: 'Need to borrow or trade for a working lawn mower this weekend.',
        type: 'REQUEST',
        category: 'Tools & Equipment',
        priceInBucks: 5,
        imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=800&auto=format&fit=crop&q=60',
        authorId: user1.id,
      },
      {
        title: 'Tampa Bay Professional Cleaning Services',
        description: 'Commercial and residential deep cleaning packages available.',
        type: 'COMMERCIAL',
        category: 'Services',
        priceInBucks: 50,
        imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=60',
        authorId: user1.id,
      },
      {
        title: 'Homemade Sourdough Bread',
        description: 'Freshly baked artisan sourdough loaves ready for pickup.',
        type: 'OFFER',
        category: 'Food & Garden',
        priceInBucks: 3,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=60',
        authorId: user2.id,
      },
      {
        title: 'Guitar Lessons for Beginners',
        description: 'Offering free acoustic guitar lessons on Tuesday evenings.',
        type: 'OFFER',
        category: 'Education',
        priceInBucks: 0,
        imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60',
        authorId: user2.id,
      },
      {
        title: 'Bradenton Handyman & Repair',
        description: 'Reliable household repairs, fixture replacements, and carpentry.',
        type: 'COMMERCIAL',
        category: 'Services',
        priceInBucks: 40,
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60',
        authorId: user3.id,
      },
      {
        title: 'Childrens Books Bundle',
        description: 'Collection of gently used picture books for ages 4-8.',
        type: 'OFFER',
        category: 'Goods',
        priceInBucks: 0,
        imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=60',
        authorId: user3.id,
      },
      {
        title: 'Sarasota Landscape & Lawn Care',
        description: 'Professional lawn mowing, trimming, and yard cleanup.',
        type: 'COMMERCIAL',
        category: 'Services',
        priceInBucks: 45,
        imageUrl: 'https://images.unsplash.com/photo-1558904541-efa873a87679?w=800&auto=format&fit=crop&q=60',
        authorId: user4.id,
      },
      {
        title: 'Need Help Moving Furniture',
        description: 'Looking for two strong volunteers to help move a sofa this Saturday morning.',
        type: 'REQUEST',
        category: 'Community Help',
        priceInBucks: 15,
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=60',
        authorId: user4.id,
      },
    ],
  });

  console.log('Database seeded successfully with Admin account!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });