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

    // Fallback: If session user ID isn't set, find the user by their email address
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

    const { quizId, answers } = await request.json(); // answers = { [questionId]: selectedOptionIndex }

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

    // Check if user already passed this quiz previously
    const existingAttempt = await prisma.quizAttempt.findUnique({
      where: { quizId_userId: { quizId, userId } },
    });

    if (existingAttempt?.passed) {
      return NextResponse.json({ success: true, alreadyPassed: true, message: 'You have already passed this quiz and claimed your reward!' });
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

    // Save or update attempt using the resolved userId
    await prisma.quizAttempt.upsert({
      where: { quizId_userId: { quizId, userId } },
      update: { passed, score },
      create: { quizId, userId, passed, score },
    });

    if (passed) {
      const postTitle = quiz.post?.title || 'Quiz Completion';
      const reward = Number(quiz.rewardAmount) > 0 ? Number(quiz.rewardAmount) : 5; // Fallback to 5 if 0 or undefined

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { growbucks: { increment: reward } },
        }),
        prisma.transaction.create({
          data: {
            receiverId: userId,
            amount: reward,
            type: 'ACTIVITY',
            reason: `Passed Quiz: ${postTitle}`,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        passed: true,
        score,
        message: `🎉 Passed with ${score}%! ${reward} Growbucks rewarded!`,
      });
    } else {
      return NextResponse.json({
        success: true,
        passed: false,
        score,
        message: `❌ You scored ${score}%. Required passing score is ${quiz.passingPercentage}%. You can retake the quiz!`,
      });
    }
  } catch (err: any) {
    console.error('Quiz submission error:', err);
    return NextResponse.json({ error: err.message || 'Server error submitting quiz.' }, { status: 500 });
  }
}