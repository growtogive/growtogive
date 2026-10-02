'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Quiz fields
  const [hasQuiz, setHasQuiz] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('5');
  const [passingPercentage, setPassingPercentage] = useState('70');
  const [questions, setQuestions] = useState<Array<{ questionText: string; options: string[]; correctAnswer: number }>>([]);

  // Event fields
  const [hasEvent, setHasEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventRewardAmount, setEventRewardAmount] = useState('5');

  const locationInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = (session?.user as any)?.role?.toUpperCase() === 'ADMIN';

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchPost();
    }
  }, [id]);

  useEffect(() => {
    if (hasEvent && locationInputRef.current && window.google?.maps?.places) {
      const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current, {
        types: ['geocode', 'establishment'],
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          setEventLocation(place.formatted_address);
        }
      });
    }
  }, [hasEvent]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

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

      if (p.event) {
        setHasEvent(true);
        setEventTitle(p.event.title || '');
        setEventDescription(p.event.description || '');
        if (p.event.eventDate) {
          const dateObj = new Date(p.event.eventDate);
          const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 16) : '';
          setEventDate(formattedDate);
        }
        setEventLocation(p.event.location || '');
        setEventRewardAmount(p.event.rewardAmount?.toString() || '5');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    if (images.length >= 5) {
      setError('Posts allow a maximum of 5 images.');
      return;
    }
    setImages([...images, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

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
      setError('Failed to process device images.');
    }
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

    const finalCategory = categoryName === 'CUSTOM' ? customCategory : categoryName;

    if (!finalCategory.trim()) {
      setError('Please select or enter a category taxonomy.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        title,
        description,
        categoryName: finalCategory.trim(),
        price: price ? parseFloat(price) : null,
        videoUrl: videoUrl || null,
        images,
        quiz: hasQuiz ? {
          rewardAmount: parseFloat(rewardAmount) || 0,
          passingPercentage: parseInt(passingPercentage) || 70,
          questions,
        } : null,
        event: hasEvent ? {
          title: eventTitle || title,
          description: eventDescription || description,
          eventDate: eventDate ? new Date(eventDate).toISOString() : null,
          location: eventLocation || null,
          rewardAmount: parseFloat(eventRewardAmount) || 0,
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 pt-8">
      <main className="max-w-2xl mx-auto px-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-900">Edit Post</h1>
          <Link href={`/posts/${id}`} className="text-xs font-bold text-slate-600 hover:text-slate-900">Cancel</Link>
        </div>

        {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Post Title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category Taxonomy</label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                <option value="CUSTOM">+ Add New Category...</option>
              </select>
              {categoryName === 'CUSTOM' && (
                <input
                  type="text"
                  required
                  placeholder="Enter new category name..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Price / Fee ($)</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Video URL (Optional)</label>
            <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
          </div>

          {/* Image Upload Manager (URL + Device File Selection) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Images (Up to 5)</label>
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
                onClick={handleAddImageUrl}
                className="px-4 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
              >
                Add URL
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex-1 border-2 border-dashed border-slate-300 rounded-xl p-3 flex items-center justify-center cursor-pointer text-xs text-slate-600 font-bold hover:bg-slate-50">
                📁 Upload from Device
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
              </label>
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description</label>
            <textarea rows={5} required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
          </div>

          {/* Event Config with Google Places Autocomplete */}
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-blue-900 uppercase tracking-wider">📅 Enable Event Details</label>
              <input type="checkbox" checked={hasEvent} onChange={(e) => setHasEvent(e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
            </div>

            {hasEvent && (
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-4">
                <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Event Title" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold" />
                <textarea rows={2} value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} placeholder="Event description..." className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold" />
                  <input type="number" value={eventRewardAmount} onChange={(e) => setEventRewardAmount(e.target.value)} placeholder="Reward GB" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <input type="text" ref={locationInputRef} value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Start typing address..." className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold" />
              </div>
            )}
          </div>

          {/* Quiz Config */}
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-900 uppercase tracking-wider">🧠 Enable Knowledge Quiz</label>
              <input type="checkbox" checked={hasQuiz} onChange={(e) => setHasQuiz(e.target.checked)} className="w-4 h-4 accent-amber-600 cursor-pointer" />
            </div>

            {hasQuiz && (
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} placeholder="Reward GB" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold" />
                  <input type="number" value={passingPercentage} onChange={(e) => setPassingPercentage(e.target.value)} placeholder="Passing %" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <button type="button" onClick={handleAddQuestion} className="px-3 py-1.5 bg-amber-600 text-white font-bold text-xs rounded-xl">+ Add Question</button>
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 bg-white border border-amber-200 rounded-xl space-y-3">
                    <input type="text" value={q.questionText} onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)} placeholder="Question text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input type="radio" name={`correct-${qIdx}`} checked={q.correctAnswer === oIdx} onChange={() => handleCorrectAnswerChange(qIdx, oIdx)} className="accent-amber-600" />
                        <input type="text" value={opt} onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting} className="w-full py-3.5 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50">
            {submitting ? 'Saving Changes...' : 'Update Post'}
          </button>
        </form>
      </main>
    </div>
  );
}