'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewPostPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Optional Quiz State
  const [hasQuiz, setHasQuiz] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [quizReward, setQuizReward] = useState('5.00');
  const [passingPercentage, setPassingPercentage] = useState('100');

  // Optional Event State
  const [hasEvent, setHasEvent] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventReward, setEventReward] = useState('10.00');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setError('Posts allow a maximum of 5 images.');
      return;
    }

    try {
      const promises = Array.from(files).map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const base64Images = await Promise.all(promises);
      setImages((prev) => [...prev, ...base64Images].slice(0, 5));
    } catch (err: any) {
      setError('Failed to process images.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          categoryName,
          videoUrl,
          price: price ? parseFloat(price) : null,
          images,
          quiz: hasQuiz ? {
            question: quizQuestion,
            options: quizOptions,
            correctAnswer: Number(correctAnswer),
            rewardAmount: quizReward,
            passingPercentage: parseInt(passingPercentage) || 100,
          } : null,
          event: hasEvent ? {
            eventDate,
            location: eventLocation,
            rewardAmount: eventReward,
          } : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post.');

      router.push('/');
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm p-8 rounded-3xl">
        <h1 className="text-2xl font-black mb-2">Create Admin Post</h1>
        <p className="text-xs text-slate-500 mb-6">Publish persistent posts with optional quizzes, events, and rewards.</p>

        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Post Title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-sm bg-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Category Taxonomy</label>
              <input type="text" required placeholder="e.g. Announcements" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Optional Price ($ / GB)</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full px-4 py-2 border rounded-xl text-sm bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Video URL (Optional)</label>
            <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2 border rounded-xl text-sm bg-white" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Images (Up to 5)</label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {images.map((img, idx) => (
                <div key={idx} className="h-20 bg-slate-100 rounded-lg relative overflow-hidden border">
                  <img src={img} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-rose-600 text-white w-5 h-5 rounded-full text-xs font-bold">×</button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer text-xs text-slate-400 font-bold hover:bg-slate-50">
                  + Add
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Description</label>
            <textarea rows={4} required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-sm bg-white" />
          </div>

          {/* Quiz Config with Correct Answer Radio */}
          <div className="p-4 bg-slate-50 border rounded-2xl space-y-3">
            <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
              <input type="checkbox" checked={hasQuiz} onChange={(e) => setHasQuiz(e.target.checked)} />
              Attach Quiz (Growbucks Reward &amp; Retries)
            </label>
            {hasQuiz && (
              <div className="space-y-3 pt-2">
                <input type="text" placeholder="Quiz Question" value={quizQuestion} onChange={(e) => setQuizQuestion(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                <p className="text-[11px] font-bold text-slate-500">Fill in options and check the radio button next to the <strong>correct answer</strong>:</p>
                {quizOptions.map((opt, oIdx) => (
                  <div key={oIdx} className="flex gap-2 items-center">
                    <input 
                      type="radio" 
                      name="correctQuizOption" 
                      checked={correctAnswer === oIdx} 
                      onChange={() => setCorrectAnswer(oIdx)} 
                      title="Mark as correct answer" 
                      className="cursor-pointer"
                    />
                    <input 
                      type="text" 
                      placeholder={`Option ${oIdx + 1}`} 
                      value={opt} 
                      onChange={(e) => {
                        const updated = [...quizOptions];
                        updated[oIdx] = e.target.value;
                        setQuizOptions(updated);
                      }} 
                      className="flex-1 px-3 py-1.5 border rounded-xl text-xs bg-white" 
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Passing Grade (%)</label>
                    <input type="number" value={passingPercentage} onChange={(e) => setPassingPercentage(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Growbucks Reward</label>
                    <input type="number" value={quizReward} onChange={(e) => setQuizReward(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Event Config */}
          <div className="p-4 bg-slate-50 border rounded-2xl space-y-3">
            <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
              <input type="checkbox" checked={hasEvent} onChange={(e) => setHasEvent(e.target.checked)} />
              Attach Event (Attendance Reward)
            </label>
            {hasEvent && (
              <div className="space-y-3 pt-2">
                <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                <input type="text" placeholder="Event Location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                <input type="number" placeholder="Growbucks Reward Amount" value={eventReward} onChange={(e) => setEventReward(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link href="/" className="px-5 py-2.5 bg-slate-100 font-bold rounded-xl text-xs">Cancel</Link>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs cursor-pointer">
              {submitting ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}