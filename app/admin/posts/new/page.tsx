'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewPostPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Multi-Question Quiz State
  const [hasQuiz, setHasQuiz] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('5');
  const [passingPercentage, setPassingPercentage] = useState('70');
  const [questions, setQuestions] = useState<Array<{ questionText: string; options: string[]; correctAnswer: number }>>([
    { questionText: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);

  // Optional Event State
  const [hasEvent, setHasEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventReward, setEventReward] = useState('5');

  const locationInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

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
        if (data.categories.length > 0) {
          setCategoryName(data.categories[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load categories');
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
    setError('');
    setSubmitting(true);

    const finalCategory = categoryName === 'CUSTOM' ? customCategory : categoryName;

    if (!finalCategory.trim()) {
      setError('Please select or enter a category taxonomy.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          categoryName: finalCategory.trim(),
          videoUrl: videoUrl || null,
          price: price ? parseFloat(price) : null,
          images,
          quiz: hasQuiz ? {
            rewardAmount: parseFloat(rewardAmount) || 0,
            passingPercentage: parseInt(passingPercentage) || 70,
            questions: questions.filter(q => q.questionText.trim() !== ''),
          } : null,
          event: hasEvent ? {
            title: eventTitle || title,
            description: eventDescription || description,
            eventDate: eventDate ? new Date(eventDate).toISOString() : null,
            location: eventLocation || null,
            rewardAmount: parseFloat(eventReward) || 0,
          } : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post.');

      router.push(`/posts/${data.post.id}`);
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
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm bg-white font-semibold"
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
                  className="w-full mt-2 px-4 py-2 border rounded-xl text-sm bg-white"
                />
              )}
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

          {/* Image Upload Manager (URL + Device File Selection) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Images (Up to 5)</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste image URL..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-xl text-xs bg-white"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
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
                  <div key={idx} className="h-24 bg-slate-100 rounded-xl relative overflow-hidden border">
                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-rose-600 text-white w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Description</label>
            <textarea rows={4} required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-sm bg-white" />
          </div>

          {/* Event Config with Google Maps Autocomplete */}
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
            <label className="flex items-center gap-2 font-bold text-sm cursor-pointer text-blue-900">
              <input type="checkbox" checked={hasEvent} onChange={(e) => setHasEvent(e.target.checked)} className="accent-blue-600" />
              📅 Attach Event (Attendance &amp; Reward)
            </label>
            {hasEvent && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Event Title</label>
                  <input type="text" placeholder="Defaults to post title if blank" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Event Description</label>
                  <textarea rows={2} placeholder="Event specific details..." value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Date &amp; Time</label>
                    <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Reward (GB)</label>
                    <input type="number" value={eventReward} onChange={(e) => setEventReward(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Address / Location (Google Places)</label>
                  <input
                    type="text"
                    ref={locationInputRef}
                    placeholder="Start typing address..."
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quiz Config */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-bold text-sm cursor-pointer text-amber-900">
                <input type="checkbox" checked={hasQuiz} onChange={(e) => setHasQuiz(e.target.checked)} className="accent-amber-600" />
                🧠 Attach Knowledge Quiz (Multiple Questions)
              </label>
            </div>

            {hasQuiz && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Reward Amount (GB)</label>
                    <input type="number" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Passing Score (%)</label>
                    <input type="number" value={passingPercentage} onChange={(e) => setPassingPercentage(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white" />
                  </div>
                </div>

                <div className="space-y-4">
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
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="text-xs font-bold text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
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