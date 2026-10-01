import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: List all posts for the homepage (Newest first, never expire)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const posts = await prisma.post.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: true,
        quiz: true,
        event: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ posts });
  } catch (err: any) {
    console.error('Failed to fetch posts:', err);
    return NextResponse.json({ error: 'Server error fetching posts.' }, { status: 500 });
  }
}

// POST: Create a new post (Admin Only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any)?.role?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, images, videoUrl, price, categoryName, quiz, event } = body;

    if (!title || !description || !categoryName) {
      return NextResponse.json({ error: 'Title, description, and category are required.' }, { status: 400 });
    }

    if (images && images.length > 5) {
      return NextResponse.json({ error: 'Posts can have a maximum of 5 images.' }, { status: 400 });
    }

    // Find or create the PostCategory taxonomy
    let category = await prisma.postCategory.findUnique({
      where: { name: categoryName.trim() },
    });

    if (!category) {
      category = await prisma.postCategory.create({
        data: { name: categoryName.trim() },
      });
    }

    const newPost = await prisma.post.create({
      data: {
        title,
        description,
        images: images || [],
        videoUrl: videoUrl || null,
        price: price ? parseFloat(price) : null,
        categoryId: category.id,
        quiz: quiz?.question ? {
          create: {
            question: quiz.question,
            options: quiz.options,
            correctAnswer: Number(quiz.correctAnswer),
            rewardAmount: parseFloat(quiz.rewardAmount) || 0,
            passingPercentage: parseInt(quiz.passingPercentage) || 100,
          }
        } : undefined,
        event: event?.eventDate ? {
          create: {
            eventDate: new Date(event.eventDate),
            location: event.location || null,
            rewardAmount: parseFloat(event.rewardAmount) || 0,
          }
        } : undefined,
      },
      include: {
        category: true,
        quiz: true,
        event: true,
      },
    });

    return NextResponse.json({ success: true, post: newPost });
  } catch (err: any) {
    console.error('Failed to create post:', err);
    return NextResponse.json({ error: err.message || 'Server error creating post.' }, { status: 500 });
  }
}