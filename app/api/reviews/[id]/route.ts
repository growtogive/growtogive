import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const reviewId = params.id;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const reviewId = params.id;
    const body = await request.json();
    const { rating, comment, userId } = body;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.authorId !== userId) {
      return NextResponse.json({ error: 'Only the author can edit this review.' }, { status: 403 });
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: rating ? Number(rating) : undefined,
        comment: comment ? comment.trim() : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}