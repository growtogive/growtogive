// app/api/posts/[slug]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function findPost(identifier: string) {
  let post = await prisma.post.findUnique({
    where: { slug: identifier },
    include: {
      category: true,
      quiz: { include: { questions: true } },
      event: { include: { attendees: { include: { user: true } } } },
    },
  });
  if (!post) {
    post = await prisma.post.findUnique({
      where: { id: identifier },
      include: {
        category: true,
        quiz: { include: { questions: true } },
        event: { include: { attendees: { include: { user: true } } } },
      },
    });
  }
  return post;
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const post = await findPost(slug);
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (err: any) {
    console.error('Failed to fetch post:', err);
    return NextResponse.json({ error: 'Server error fetching post.' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any)?.role?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { slug } = await context.params;
    const body = await request.json();
    const { title, description, images, videoUrl, price, categoryName, isSticky, quiz, event } = body;

    if (!title || !description || !categoryName) {
      return NextResponse.json({ error: 'Title, description, and category are required.' }, { status: 400 });
    }

    let category = await prisma.postCategory.findUnique({ where: { name: categoryName.trim() } });
    if (!category) {
      category = await prisma.postCategory.create({ data: { name: categoryName.trim() } });
    }

    const existingPost = await findPost(slug);
    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // Optional: Update slug if title changed, or keep existing slug
    // For now, we update the main fields while preserving the slug or updating it if needed
    const updatedPost = await prisma.post.update({
      where: { id: existingPost.id },
      data: {
        title,
        description,
        images: images || [],
        videoUrl: videoUrl || null,
        price: price !== null && price !== '' ? parseFloat(price) : null,
        isSticky: Boolean(isSticky),
        categoryId: category.id,
      },
      include: {
        category: true,
        quiz: { include: { questions: true } },
        event: { include: { attendees: { include: { user: true } } } },
      },
    });

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (err: any) {
    console.error('Failed to update post:', err);
    return NextResponse.json({ error: err.message || 'Server error updating post.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any)?.role?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { slug } = await context.params;
    const existingPost = await findPost(slug);
    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    await prisma.post.delete({ where: { id: existingPost.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete post:', err);
    return NextResponse.json({ error: 'Server error deleting post.' }, { status: 500 });
  }
}