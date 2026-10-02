import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId = (session.user as any).id;

    if (!userId && session?.user?.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (dbUser) {
        userId = dbUser.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID could not be resolved from session.' }, { status: 400 });
    }

    const { quizId, answers } = await request.json();

    if (!quizId || !answers) {
      return NextResponse.json({ error: 'Missing quiz ID or answers.' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { 
        post: true, 
        questions: true 
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    const questions: QuizQuestion[] = quiz.questions;
    const totalQuestions = questions.length;

    if (totalQuestions === 0) {
      return NextResponse.json({ error: 'This quiz has no questions configured.' }, { status: 400 });
    }

    let correctCount = 0;
    questions.forEach((q: QuizQuestion) => {
      if (answers[q.id] !== undefined && Number(answers[q.id]) === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= quiz.passingPercentage;

    if (!passed) {
      await prisma.quizAttempt.upsert({
        where: { quizId_userId: { quizId, userId } },
        update: { passed, score },
        create: { quizId, userId, passed, score },
      });

      return NextResponse.json({
        success: true,
        passed: false,
        score,
        message: `❌ You scored ${score}%. Required passing score is ${quiz.passingPercentage}%. You can retake the quiz!`,
      });
    }

    const postTitle = quiz.post?.title || 'Quiz Completion';
    const reward = Number(quiz.rewardAmount) > 0 ? Number(quiz.rewardAmount) : 1;

    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@growtogive.com' },
      select: { id: true, growbucks: true },
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin account (admin@growtogive.com) not found.' }, { status: 500 });
    }

    if ((adminUser.growbucks || 0) < reward) {
      return NextResponse.json({ error: 'Admin GrowBuck pool is insufficient to reward this quiz.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const existingAttempt = await tx.quizAttempt.findUnique({
        where: { quizId_userId: { quizId, userId } },
      });

      if (existingAttempt?.passed) {
        throw new Error("ALREADY_CLAIMED");
      }

      await tx.quizAttempt.upsert({
        where: { quizId_userId: { quizId, userId } },
        update: { passed: true, score },
        create: { quizId, userId, passed: true, score },
      });

      // 1. Increment user balance
      await tx.user.update({
        where: { id: userId },
        data: { growbucks: { increment: reward } },
      });

      // 2. Decrement admin balance
      await tx.user.update({
        where: { id: adminUser.id },
        data: { growbucks: { decrement: reward } },
      });

      // 3. Create TWO transaction records:
      // - Record A: Positive credit for the user earning it (Admin -> User)
      // - Record B: Outflow/distribution record for the admin ledger
      await tx.transaction.createMany({
        data: [
          {
            senderId: adminUser.id,
            receiverId: userId,
            amount: reward, // Positive (+5.00)
            type: 'Activity',
            reason: `Passed Quiz: ${postTitle}`,
          },
          {
            senderId: adminUser.id,
            receiverId: userId,
            amount: -reward, // Negative (-5.00) for admin ledger tracking
            type: 'Activity',
            reason: `Distributed reward for Quiz: ${postTitle}`,
          },
        ],
      });

      return { success: true };
    });

    return NextResponse.json({
      success: true,
      passed: true,
      score,
      message: `🎉 Passed with ${score}%! ${reward} Growbucks rewarded!`,
    });

  } catch (err: any) {
    if (err.message === "ALREADY_CLAIMED") {
      return NextResponse.json({ success: true, alreadyPassed: true, message: 'You have already passed this quiz and claimed your reward!' });
    }
    console.error('Quiz submission error:', err);
    return NextResponse.json({ error: err.message || 'Server error submitting quiz.' }, { status: 500 });
  }
}