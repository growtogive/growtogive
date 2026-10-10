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
        select: { id: true, basicTrainingPassed: true },
      });
      if (dbUser) {
        userId = dbUser.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID could not be resolved from session.' }, { status: 400 });
    }

    // Fetch full user record to check basic training status
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { basicTrainingPassed: true },
    });

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

    // --- BASIC TRAINING PREREQUISITE & IDENTIFICATION CHECK ---
    const postTitle = (quiz.post?.title || '').trim().toLowerCase();
    const isIntroToGrowToGive = postTitle === 'introduction to growtogive';
    const isBasicTrainingQuiz = isIntroToGrowToGive || postTitle.includes('basic training') || postTitle.includes('onboarding');

    // If the user has NOT passed basic training, and they are trying to take any OTHER quiz, block them!
    if (!currentUser?.basicTrainingPassed && !isBasicTrainingQuiz) {
      return NextResponse.json(
        { error: 'You must complete and pass the Basic Training quiz before taking other quizzes.' },
        { status: 403 }
      );
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

    // Determine reward amount: 100 Growbucks specifically for Introduction To GrowToGive, otherwise standard quiz reward
    const reward = isIntroToGrowToGive ? 100 : (Number(quiz.rewardAmount) > 0 ? Number(quiz.rewardAmount) : 1);
    const displayTitle = quiz.post?.title || 'Quiz Completion';

    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@growtogive.com' },
      select: { id: true },
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin account (admin@growtogive.com) not found.' }, { status: 500 });
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

      // If this was the Basic Training quiz / Intro To GrowToGive, mark basicTrainingPassed as true
      if (isBasicTrainingQuiz) {
        await tx.user.update({
          where: { id: userId },
          data: { basicTrainingPassed: true },
        });
      }

      // 1. Increment user balance
      await tx.user.update({
        where: { id: userId },
        data: { growbucks: { increment: reward } },
      });

      // 2. Decrement admin balance (can drop below zero)
      await tx.user.update({
        where: { id: adminUser.id },
        data: { growbucks: { decrement: reward } },
      });

      // 3. Create a valid transaction record with a positive amount representing the transfer
      await tx.transaction.create({
        data: {
          senderId: adminUser.id,
          receiverId: userId,
          amount: reward,
          type: 'Activity',
          reason: `Passed Quiz: ${displayTitle}`,
        },
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