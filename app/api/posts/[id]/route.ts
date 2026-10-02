import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch single post
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    let userId = (session?.user as any)?.id;

    if (!userId && session?.user?.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (dbUser) {
        userId = dbUser.id;
      }
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        category: true,
        quiz: {
          include: {
            questions: true,
            attempts: {
              where: {
                userId: userId || 'NO_USER_LOGGED_IN',
              },
            },
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

    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (err: any) {
    console.error('Failed to fetch post:', err);
    return NextResponse.json({ error: 'Server error fetching post.' }, { status: 500 });
  }
}

// PUT: Update post (Admin Only)
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any)?.role?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { title, description, images, videoUrl, price, categoryName, quiz, event } = body;

    if (!title || !description || !categoryName) {
      return NextResponse.json({ error: 'Title, description, and category are required.' }, { status: 400 });
    }

    if (images && images.length > 5) {
      return NextResponse.json({ error: 'Posts can have a maximum of 5 images.' }, { status: 400 });
    }

    let category = await prisma.postCategory.findUnique({
      where: { name: categoryName.trim() },
    });

    if (!category) {
      category = await prisma.postCategory.create({
        data: { name: categoryName.trim() },
      });
    }

    const existingPost = await prisma.post.findUnique({
      where: { id },
      include: { quiz: true, event: true },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    const quizOperation = quiz?.questions && quiz.questions.length > 0
      ? {
          upsert: {
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
            update: {
              rewardAmount: parseFloat(quiz.rewardAmount) || 0,
              passingPercentage: parseInt(quiz.passingPercentage) || 70,
              questions: {
                deleteMany: {},
                create: quiz.questions.map((q: any) => ({
                  questionText: q.questionText,
                  options: q.options,
                  correctAnswer: Number(q.correctAnswer),
                })),
              },
            },
          },
        }
      : existingPost.quiz 
        ? { delete: true } 
        : undefined;

    const eventOperation = event?.eventDate
      ? {
          upsert: {
            create: {
              title: event.title || title,
              description: event.description || description,
              eventDate: new Date(event.eventDate),
              location: event.location || null,
              rewardAmount: parseFloat(event.rewardAmount) || 0,
            },
            update: {
              title: event.title || title,
              description: event.description || description,
              eventDate: new Date(event.eventDate),
              location: event.location || null,
              rewardAmount: parseFloat(event.rewardAmount) || 0,
            },
          },
        }
      : existingPost.event 
        ? { delete: true } 
        : undefined;

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title,
        description,
        images: images || [],
        videoUrl: videoUrl || null,
        price: price !== null && price !== '' ? parseFloat(price) : null,
        categoryId: category.id,
        quiz: quizOperation,
        event: eventOperation,
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

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (err: any) {
    console.error('Failed to update post:', err);
    return NextResponse.json({ error: err.message || 'Server error updating post.' }, { status: 500 });
  }
}

// DELETE: Delete post (Admin Only)
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any)?.role?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { id } = await context.params;
    await prisma.post.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete post:', err);
    return NextResponse.json({ error: 'Server error deleting post.' }, { status: 500 });
  }
}