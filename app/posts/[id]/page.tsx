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

  // Event attendance states
  const [attendingStatus, setAttendingStatus] = useState<string | null>(null);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);

  const isAdmin = (session?.user as any)?.role?.toUpperCase() === 'ADMIN';
  const currentUserId = (session?.user as any)?.id;

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

      // Check if user already passed quiz
      if (data.post?.quiz?.attempts && Array.isArray(data.post.quiz.attempts)) {
        const passedAttempt = data.post.quiz.attempts.find((a: any) => a.passed === true);
        if (passedAttempt) {
          setHasPassed(true);
        }
      }

      // Check user's current attendance status
      if (data.post?.event?.attendees && currentUserId) {
        const userAttendee = data.post.event.attendees.find((a: any) => a.userId === currentUserId);
        if (userAttendee) {
          setAttendingStatus(userAttendee.status);
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

  const handleAttendanceChange = async (newStatus: string) => {
    if (!post?.event) return;
    setUpdatingAttendance(true);
    try {
      const res = await fetch('/api/events/attend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: post.event.id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update attendance');

      setAttendingStatus(newStatus);
      fetchPost(); // Refresh attendee list
    } catch (err: any) {
      alert(err.message || 'Error updating attendance');
    } finally {
      setUpdatingAttendance(false);
    }
  };

  const handleAdminRemoveAttendee = async (attendeeUserId: string) => {
    if (!isAdmin || !post?.event) return;
    if (!confirm('Are you sure you want to remove this attendee?')) return;

    try {
      const res = await fetch('/api/events/attend', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: post.event.id, userId: attendeeUserId }),
      });
      if (!res.ok) throw new Error('Failed to remove attendee');
      fetchPost();
    } catch (err: any) {
      alert(err.message);
    }
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
  const attendeesList = (post.event?.attendees as any[]) || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 pt-8">
      <main className="max-w-3xl mx-auto px-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm relative">
          
          {/* Admin Edit Link */}
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

          {post.price !== null && post.price !== undefined && Number(post.price) > 0 ? (
            <Link 
              href={`/checkout?postId=${post.id}&amount=${post.price}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <span>🏷️ Price / Fee: ${Number(post.price).toFixed(2)} (Click to Checkout ↗)</span>
            </Link>
          ) : post.price !== null && post.price !== undefined ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
              <span>🏷️ Price / Fee: Free</span>
            </div>
          ) : null}

          {/* Event Section */}
          {post.event && (
            <div className="p-6 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-blue-900 uppercase tracking-wider">📅 Event Details</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Reward: {post.event.rewardAmount} GB
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">{post.event.title}</h3>
                {post.event.description && <p className="text-xs text-slate-600">{post.event.description}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-blue-100">
                <div>
                  <span className="font-bold text-slate-700 block">Date & Time:</span>
                  <span className="text-slate-600">
                    {new Date(post.event.eventDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Address / Location:</span>
                  <span className="text-slate-600">{post.event.location || 'Location not specified'}</span>
                </div>
              </div>

              {/* Attendance Actions */}
              {status === 'authenticated' && (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={updatingAttendance}
                    onClick={() => handleAttendanceChange('ATTENDING')}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      attendingStatus === 'ATTENDING'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Attending
                  </button>
                  <button
                    type="button"
                    disabled={updatingAttendance}
                    onClick={() => handleAttendanceChange('NOT_ATTENDING')}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      attendingStatus === 'NOT_ATTENDING'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✕ Not Attending
                  </button>
                </div>
              )}

              {/* Attendees List */}
              <div className="border-t border-blue-200 pt-4 space-y-2">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">
                  Attendees ({attendeesList.filter((a: any) => a.status === 'ATTENDING').length} Attending)
                </h4>
                {attendeesList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No attendance responses yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {attendeesList.map((attendee: any) => (
                      <div key={attendee.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-blue-100 text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{attendee.user?.name || attendee.user?.email}</span>
                          <span className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            attendee.status === 'ATTENDING' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {attendee.status}
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleAdminRemoveAttendee(attendee.userId)}
                            className="text-rose-600 hover:text-rose-800 font-bold text-[10px] px-2 py-1 bg-rose-50 rounded-md cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

        </div>
      </main>
    </div>
  );
}