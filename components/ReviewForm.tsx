'use client';

import { useState } from 'react';

interface ReviewFormProps {
  listingId: string;
  listingType: string;
  authorId: string;
  currentUserId: string;
  existingReviews?: any[];
  onReviewSubmitted: () => void;
}

export default function ReviewForm({
  listingId,
  listingType,
  authorId,
  currentUserId,
  existingReviews = [],
  onReviewSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [localSubmittedReview, setLocalSubmittedReview] = useState<any>(null);

  // Check if the current user has already submitted a review
  const userExistingReview = 
    localSubmittedReview ||
    existingReviews.find(
      (rev) =>
        rev.authorId === currentUserId ||
        rev.author?.id === currentUserId
    );

  // Rule: Authors cannot review themselves
  if (authorId === currentUserId) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center font-medium rounded-xl">
        You cannot leave a review on your own listing or profile.
      </div>
    );
  }

  // Rule: Display the user's review above and block multiple submissions
  if (userExistingReview) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Your Submitted Review</span>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500 font-bold text-sm">{'★'.repeat(userExistingReview.rating || 5)}</span>
            <span className="text-slate-400 text-xs">{userExistingReview.date || 'Just now'}</span>
          </div>
        </div>
        <p className="text-slate-700 text-sm leading-relaxed">{userExistingReview.comment}</p>
        <p className="text-[11px] text-emerald-600 font-bold italic pt-1">✓ You have already reviewed this listing. Only one review per user is permitted.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please enter a review comment.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, rating, comment }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      // Optimistically store locally so the view updates instantly before parent re-fetches
      const newReviewObj = {
        id: data.id || Date.now().toString(),
        authorId: currentUserId,
        author: 'John Doe',
        rating,
        comment,
        date: 'Just now',
      };

      setLocalSubmittedReview(newReviewObj);
      setComment('');
      setRating(5);
      setSuccessMessage('Review posted successfully!');
      onReviewSubmitted();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm rounded-2xl">
      <h4 className="font-bold text-slate-900 text-sm">Leave a Review</h4>

      {error && <p className="text-rose-600 text-xs font-medium">{error}</p>}
      {successMessage && <p className="text-emerald-600 text-xs font-medium">{successMessage}</p>}

      {/* Star Rating Picker */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-slate-600 mr-2">Rating:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setRating(star)}
            className={`text-xl transition-colors cursor-pointer ${
              star <= rating ? 'text-amber-500' : 'text-slate-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Comment Input */}
      <div>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            listingType === 'COMMERCIAL'
              ? 'Review this commercial service or business...'
              : 'Review your experience with this member...'
          }
          className="w-full p-3 text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-900 rounded-lg"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer rounded-lg"
      >
        {submitting ? 'Submitting...' : 'Post Review'}
      </button>
    </form>
  );
}