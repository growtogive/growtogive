'use client';

import { useState } from 'react';

interface Review {
  id: string;
  authorId?: string;
  author?: { id: string; name: string } | string;
  rating: number;
  date: string;
  comment: string;
}

interface ReviewSectionProps {
  listingId: string;
  initialReviews: Review[];
  currentUserId: string;
}

export default function ReviewSection({
  listingId,
  initialReviews,
  currentUserId,
}: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [error, setError] = useState('');

  const handleStartEdit = (review: Review) => {
    setEditingId(review.id);
    setEditComment(review.comment);
    setEditRating(review.rating);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditComment('');
    setEditRating(5);
    setError('');
  };

  const handleSaveEdit = async (reviewId: string) => {
    try {
      setError('');
      
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: editComment,
          rating: editRating,
          authorId: currentUserId,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Server returned non-JSON response:', text);
        throw new Error(`Server error (Status ${res.status}): Endpoint returned an HTML page instead of JSON.`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update review');
      }

      const updated: Review = data;
      setReviews(reviews.map((r) => (r.id === reviewId ? updated : r)));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while updating.');
    }
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400 text-xs italic">
        No reviews yet. Be the first to leave feedback!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-rose-600 text-xs font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">{error}</p>}
      
      {reviews.map((review) => {
        const reviewAuthorId = review.authorId || (typeof review.author === 'object' ? review.author?.id : '');
        const reviewAuthorName = typeof review.author === 'object' ? review.author?.name : (review.author || 'Community Member');
        const isAuthor = reviewAuthorId === currentUserId;
        const isEditing = editingId === review.id;

        return (
          <div key={review.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900">{reviewAuthorName}</span>
                <span className="text-[10px] text-slate-400">• {review.date}</span>
              </div>

              {!isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold text-xs">{'★'.repeat(review.rating)}</span>
                  {isAuthor && (
                    <button
                      onClick={() => handleStartEdit(review)}
                      className="ml-2 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setEditRating(star)}
                      className={`text-sm cursor-pointer ${star <= editRating ? 'text-amber-500' : 'text-slate-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isEditing ? (
              <p className="text-slate-700 text-xs leading-relaxed">{review.comment}</p>
            ) : (
              <div className="space-y-3 pt-2">
                <textarea
                  rows={2}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-900"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(review.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}