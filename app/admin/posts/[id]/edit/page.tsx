'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function AdminEditPostPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [price, setPrice] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Quiz fields
  const [hasQuiz, setHasQuiz] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('5');
  const [passingPercentage, setPassingPercentage] = useState('70');
  const [questions, setQuestions] = useState<Array<{ questionText: string; options: string[]; correctAnswer: number }>>([]);

  const isAdmin = (session?.user as any)?.role?.toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${id}`);
      if (!res.ok) throw new Error('Failed to fetch post details.');
      const data = await res.json();
      const p = data.post;

      setTitle(p.title || '');
      setDescription(p.description || '');
      setCategoryName(p.category?.name || '');
      setPrice(p.price !== null && p.price !== undefined ? p.price.toString() : '');
      setVideoUrl(p.videoUrl || '');
      setImages(p.images || []);

      if (p.quiz) {
        setHasQuiz(true);
        setRewardAmount(p.quiz.rewardAmount?.toString() || '5');
        setPassingPercentage(p.quiz.passingPercentage?.toString() || '70');
        setQuestions(p.quiz.questions || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    if (!imageUrlInput.trim()) return;
    setImages([...images, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const handleQuestionTextChange = (idx: number, text: string) => {
    const updated = [...questions];
    updated[idx].questionText = text;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx: number, oIdx: number, val: string) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = val;
    setQuestions(updated);
  };

  const handleCorrectAnswerChange = (qIdx: number, oIdx: number) => {
    const updated = [...questions];
    updated[qIdx].correctAnswer = oIdx;
    setQuestions(updated);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title,
        description,
        categoryName,
        price: price ? parseFloat(price) : null,
        videoUrl: videoUrl || null,
        images,
        quiz: hasQuiz ? {
          rewardAmount: parseFloat(rewardAmount) || 0,
          passingPercentage: parseInt(passingPercentage) || 70,
          questions,
        } : null,
      };

      const res = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update post.');

      router.push(`/posts/${id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">Loading post editor...</div>;
  }

  if (!isAdmin && status === 'authenticated') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-rose-600 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-600 mb-4">You must be an administrator to edit posts.</p>
        <Link href={`/posts/${id}`} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">Back to Post</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 pt-8">
      <main className="max-w-2xl mx-auto px-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-900">Edit Post</h1>
          <Link href={`/posts/${id}`} className="text-xs font-bold text-slate-600 hover:text-slate-900">Cancel</Link>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Post Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category Name</label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description</label>
            <textarea
              rows={5}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Price / Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Video URL</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Image URLs Manager */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Images</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste image URL..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-4 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
              >
                Add Image
              </button>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative h-24 bg-slate-100 rounded-xl overflow-hidden border">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quiz Toggle & Settings */}
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-900 uppercase tracking-wider">Enable Knowledge Quiz</label>
              <input
                type="checkbox"
                checked={hasQuiz}
                onChange={(e) => setHasQuiz(e.target.checked)}
                className="w-4 h-4 accent-amber-600 cursor-pointer"
              />
            </div>

            {hasQuiz && (
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Reward Amount (GB)</label>
                    <input
                      type="number"
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Passing Score (%)</label>
                    <input
                      type="number"
                      value={passingPercentage}
                      onChange={(e) => setPassingPercentage(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Quiz Questions</span>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl"
                    >
                      + Add Question
                    </button>
                  </div>

                  {questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 bg-white border border-amber-200 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-700">Question {qIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Enter question text..."
                        value={q.questionText}
                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Options (Select radio for correct answer)</label>
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIdx}`}
                              checked={q.correctAnswer === oIdx}
                              onChange={() => handleCorrectAnswerChange(qIdx, oIdx)}
                              className="accent-amber-600 cursor-pointer"
                            />
                            <input
                              type="text"
                              placeholder={`Option ${oIdx + 1}`}
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Saving Changes...' : 'Update Post'}
          </button>
        </form>
      </main>
    </div>
  );
}