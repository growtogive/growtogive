import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch all posts (for homepage/feed)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');

    const posts = await prisma.post.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: true,
        quiz: {
          include: {
            questions: true,
          },
        },
        event: {
          include: {
            attendees: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ posts });
  } catch (err: any) {
    console.error('Failed to fetch posts list:', err);
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

    // Find or create category taxonomy
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
        price: price !== null && price !== '' ? parseFloat(price) : null,
        categoryId: category.id,
        quiz: quiz?.questions && quiz.questions.length > 0 ? {
          create: {
            rewardAmount: parseFloat(quiz.rewardAmount) || 0,
            passingPercentage: parseInt(quiz.passingPercentage) || 70,
            questions: {
              create: quiz.questions.map((q: any) => ({
                questionText: q.questionText,
                options: q.options,
                correctAnswer: Number(q.correctAnswer),
              })),
            },
          },
        } : undefined,
        event: event?.eventDate ? {
          create: {
            title: event.title || title,
            description: event.description || description,
            eventDate: new Date(event.eventDate),
            location: event.location || null,
            rewardAmount: parseFloat(event.rewardAmount) || 0,
          },
        } : undefined,
      },
      include: {
        category: true,
        quiz: {
          include: {
            questions: true,
          },
        },
        event: {
          include: {
            attendees: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, post: newPost });
  } catch (err: any) {
    console.error('Failed to create post:', err);
    return NextResponse.json({ error: err.message || 'Server error creating post.' }, { status: 500 });
  }
}