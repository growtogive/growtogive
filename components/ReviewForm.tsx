'use client';

import { useState } from 'react';

interface ReviewFormProps {
  listingId: string;
  listingType: string;
  authorId: string; // Listing owner ID
  currentUserId: string; // Logged-in user ID
  existingReviews: any[];
  onReviewSubmitted: () => void;
}

export default function ReviewForm({
  listingId,
  listingType,
  authorId,
  currentUserId,
  existingReviews,
  onReviewSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Secure frontend ownership check
  const isOwner = authorId === currentUserId;
  const userAlreadyReviewed = existingReviews.some((r) => r.authorId === currentUserId);

  if (isOwner) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm">
        You cannot leave feedback on your own listing. (You can reply to messages instead!)
      </div>
    );
  }

  if (userAlreadyReviewed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center text-emerald-800 text-sm font-medium">
        ✓ You have already left feedback for this listing. Thank you for participating in the community!
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please enter a comment for your review.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          rating: Number(rating),
          comment: comment.trim(),
          userId: currentUserId, // Sends actual session ID
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setComment('');
      setRating(5);
      onReviewSubmitted();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Rating
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              className={`text-2xl transition-colors cursor-pointer ${
                star <= rating ? 'text-amber-500' : 'text-slate-300'
              }`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 self-center text-xs font-bold text-slate-600">({rating}/5)</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Your Feedback / Comment
        </label>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this community exchange..."
          className="w-full rounded-2xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-slate-50/50"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
}