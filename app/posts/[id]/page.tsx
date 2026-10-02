'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { data: session, status } = useSession();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Multi-question quiz states
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [quizResult, setQuizResult] = useState<{ success: boolean; passed?: boolean; message: string; score?: number } | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [hasPassed, setHasPassed] = useState(false);

  const isAdmin = (session?.user as any)?.role?.toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id, session]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${id}`);
      if (!res.ok) throw new Error('Post not found');
      const data = await res.json();
      setPost(data.post);

      // Check if user already passed from the included attempts array
      if (data.post?.quiz?.attempts && Array.isArray(data.post.quiz.attempts)) {
        const passedAttempt = data.post.quiz.attempts.find((a: any) => a.passed === true);
        if (passedAttempt) {
          setHasPassed(true);
        }
      }
    } catch (err) {
      console.error(err);
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionId: string, optionIndex: number) => {
    if (hasPassed) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleQuizSubmit = async () => {
    if (!post?.quiz || !post.quiz.questions) return;

    const questionsList = post.quiz.questions as any[];
    if (Object.keys(answers).length < questionsList.length) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setSubmittingQuiz(true);
    try {
      const res = await fetch('/api/posts/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: post.quiz.id, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit quiz');

      const isPassed = Boolean(data.passed || data.alreadyPassed);
      setQuizResult({ success: data.success, passed: isPassed, message: data.message, score: data.score });
      
      if (isPassed) {
        setHasPassed(true);
      }
    } catch (err: any) {
      setQuizResult({ success: false, message: err.message });
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setQuizResult(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">Loading post...</div>;
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Post Not Found</h1>
        <Link href="/" className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm">Return Home</Link>
      </div>
    );
  }

  const quizQuestions = (post.quiz?.questions as any[]) || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 pt-8">
      <main className="max-w-3xl mx-auto px-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm relative">
          
          {/* Admin Edit Link (Matching /admin/posts/[id]/edit) */}
          {isAdmin && (
            <div className="absolute top-8 right-8">
              <Link 
                href={`/admin/posts/${post.id}/edit`} 
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                <span>✏️ Edit Post</span>
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between pr-24">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border uppercase tracking-wider">
              {post.category?.name || 'Announcement'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <h1 className="text-3xl font-black text-slate-900">{post.title}</h1>

          {post.images && post.images.length > 0 && (
            <div className={`grid gap-2 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {post.images.map((img: string, idx: number) => (
                <div key={idx} className="h-64 bg-slate-100 rounded-2xl overflow-hidden border">
                  <img src={img} alt={`Post img ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">{post.description}</p>

          {post.videoUrl && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl">
              <a href={post.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold text-xs">
                ▶ Watch Attached Video ↗
              </a>
            </div>
          )}

          {post.price !== null && post.price !== undefined && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
              <span>🏷️ Price / Fee:</span>
              <span>${Number(post.price).toFixed(2)}</span>
            </div>
          )}

          {/* Multi-Question Quiz Section */}
          {post.quiz && (
            <div className="p-6 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider">🧠 Knowledge Quiz</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Reward: {post.quiz.rewardAmount} GB | Passing Score: {post.quiz.passingPercentage}%
                </span>
              </div>

              {status !== 'authenticated' ? (
                <div className="p-4 bg-white border border-amber-100 rounded-xl text-xs text-slate-600 text-center font-medium">
                  Please <Link href="/api/auth/signin" className="text-blue-600 underline font-bold">log in</Link> to take this quiz and earn rewards.
                </div>
              ) : hasPassed ? (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
                  <p className="text-sm font-black text-emerald-900 tracking-wide uppercase">✅ Passed</p>
                  <p className="text-xs text-emerald-700 font-medium">
                    You have successfully passed this quiz and claimed your {post.quiz.rewardAmount} Growbucks reward!
                  </p>
                </div>
              ) : quizQuestions.length > 0 ? (
                <div className="space-y-6">
                  {quizQuestions.map((q: any, qIdx: number) => (
                    <div key={q.id} className="p-4 bg-white border border-amber-100 rounded-xl space-y-3">
                      <p className="font-bold text-xs text-slate-800">
                        {qIdx + 1}. {q.questionText}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt: string, oIdx: number) => {
                          const isSelected = answers[q.id] === oIdx;
                          return (
                            <button
                              type="button"
                              key={oIdx}
                              onClick={() => handleOptionSelect(q.id, oIdx)}
                              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    disabled={submittingQuiz}
                    onClick={handleQuizSubmit}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submittingQuiz ? 'Evaluating...' : 'Submit Answers'}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-white border border-amber-100 rounded-xl text-xs text-slate-600 text-center font-medium">
                  This quiz has no questions configured.
                </div>
              )}

              {quizResult && !hasPassed && (
                <div className={`p-3.5 rounded-xl text-xs font-bold space-y-2 ${quizResult.passed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  <p>{quizResult.message}</p>
                  {!quizResult.passed && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Event Section */}
          {post.event && (
            <div className="p-6 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-blue-900 uppercase tracking-wider">📅 Featured Event</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">Reward: {post.event.rewardAmount} GB</span>
              </div>
              <p className="text-xs text-slate-700 font-semibold">
                Date: {new Date(post.event.eventDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
              {post.event.location && <p className="text-xs text-slate-600 font-medium">Location: {post.event.location}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}