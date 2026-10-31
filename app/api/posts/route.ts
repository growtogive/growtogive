import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        quiz: { 
          include: { 
            questions: true,
            attempts: true // <--- Crucial so attempts are fetched globally too
          } 
        },
        event: true,
      },
    });
    return NextResponse.json({ posts });
  } catch (err: any) {
    console.error('Failed to fetch posts:', err);
    return NextResponse.json({ error: 'Server error fetching posts.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any)?.role?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, images, videoUrl, price, categoryName, isSticky, quiz, event } = body;

    if (!title || !description || !categoryName) {
      return NextResponse.json({ error: 'Title, description, and category are required.' }, { status: 400 });
    }

    // 1. Generate clean base slug
    const cleanTitle = String(title).trim();
    let baseSlug = cleanTitle
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) {
      baseSlug = `post-${Date.now()}`;
    }

    // 2. Ensure slug uniqueness
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await prisma.post.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 3. Find or create category
    let category = await prisma.postCategory.findUnique({ where: { name: categoryName.trim() } });
    if (!category) {
      category = await prisma.postCategory.create({ data: { name: categoryName.trim() } });
    }

    // 4. Create post
    const newPost = await prisma.post.create({
      data: {
        slug: uniqueSlug,
        title: cleanTitle,
        description: String(description),
        images: images || [],
        videoUrl: videoUrl || null,
        price: price !== null && price !== '' ? parseFloat(price) : null,
        isSticky: Boolean(isSticky),
        authorId: (session.user as any).id, // Remove this line if your Post model doesn't have an authorId field
        categoryId: category.id,
        quiz: quiz?.questions && quiz.questions.length > 0 ? {
          create: {
            rewardAmount: parseFloat(quiz.rewardAmount) || 0,
            passingPercentage: parseInt(quiz.passingPercentage) || 70,
            questions: {
              create: quiz.questions.map((q: any) => ({
                questionText: String(q.questionText || ''),
                options: q.options || [],
                correctAnswer: Number(q.correctAnswer || 0),
              })),
            },
          },
        } : undefined,
        event: event?.eventDate ? {
          create: {
            title: String(event.title || cleanTitle),
            description: String(event.description || description),
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
            attempts: true // <--- Crucial so new posts return quiz attempts properly
          } 
        },
        event: { include: { attendees: { include: { user: true } } } },
      },
    });

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (err: any) {
    console.error('Failed to create post:', err);
    return NextResponse.json({ error: err.message || 'Server error creating post.' }, { status: 500 });
  }
}