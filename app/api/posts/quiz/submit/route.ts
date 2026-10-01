import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { quizId, selectedOptionIndex } = await request.json();

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { post: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    // Check if user already passed this quiz previously
    const existingAttempt = await prisma.quizAttempt.findUnique({
      where: { quizId_userId: { quizId, userId } },
    });

    if (existingAttempt?.passed) {
      return NextResponse.json({ success: true, alreadyPassed: true, message: 'You have already passed this quiz and claimed your reward!' });
    }

    const isCorrect = Number(selectedOptionIndex) === quiz.correctAnswer;
    const score = isCorrect ? 100 : 0;
    const passed = score >= quiz.passingPercentage;

    // Save or update attempt
    await prisma.quizAttempt.upsert({
      where: { quizId_userId: { quizId, userId } },
      update: { passed, score },
      create: { quizId, userId, passed, score },
    });

    if (passed) {
      // Award Growbucks to User & Log Activity Transaction
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { growbucks: { increment: quiz.rewardAmount } },
        }),
        prisma.transaction.create({
          data: {
            receiverId: userId,
            amount: quiz.rewardAmount,
            type: 'ACTIVITY',
            reason: `Passed Quiz: ${quiz.post.title}`,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        passed: true,
        message: `🎉 ${quiz.rewardAmount} Growbucks rewarded!`,
      });
    } else {
      return NextResponse.json({
        success: true,
        passed: false,
        message: '❌ Incorrect answer. You can retake the quiz to try again!',
      });
    }
  } catch (err: any) {
    console.error('Quiz submission error:', err);
    return NextResponse.json({ error: err.message || 'Server error submitting quiz.' }, { status: 500 });
  }
}