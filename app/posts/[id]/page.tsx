'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quiz states
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ success: boolean; message: string } | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${id}`);
      if (!res.ok) throw new Error('Post not found');
      const data = await res.json();
      setPost(data.post);
    } catch (err) {
      console.error(err);
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSubmit = async () => {
    if (selectedAnswer === null || !post?.quiz) return;

    setSubmittingQuiz(true);
    try {
      const res = await fetch('/api/posts/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: post.quiz.id, selectedOptionIndex: selectedAnswer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit quiz');

      setQuizResult({ success: data.passed || data.alreadyPassed, message: data.message });
    } catch (err: any) {
      setQuizResult({ success: false, message: err.message });
    } finally {
      setSubmittingQuiz(false);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <header className="w-full bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <Link href="/" className="font-bold text-xs text-slate-600 hover:text-slate-900">← Back to Feed</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-10 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
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

          {/* Quiz Section */}
          {post.quiz && (
            <div className="p-6 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider">🧠 Knowledge Quiz</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">Reward: {post.quiz.rewardAmount} GB</span>
              </div>
              <p className="font-bold text-sm text-slate-800">{post.quiz.question}</p>
              
              <div className="space-y-2">
                {post.quiz.options.map((opt: string, oIdx: number) => (
                  <label key={oIdx} className="flex items-center gap-3 text-xs font-semibold bg-white p-3 rounded-xl border border-amber-100 cursor-pointer hover:border-amber-300">
                    <input
                      type="radio"
                      name="detail-quiz"
                      checked={selectedAnswer === oIdx}
                      onChange={() => setSelectedAnswer(oIdx)}
                    />
                    {opt}
                  </label>
                ))}
              </div>

              <button
                type="button"
                disabled={submittingQuiz}
                onClick={handleQuizSubmit}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {submittingQuiz ? 'Evaluating...' : 'Submit Answer'}
              </button>

              {quizResult && (
                <div className={`p-3.5 rounded-xl text-xs font-bold ${quizResult.success ? 'bg-emerald-50 text-emerald-800 border' : 'bg-rose-50 text-rose-700 border'}`}>
                  {quizResult.message}
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