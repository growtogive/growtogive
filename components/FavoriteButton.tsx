// components/FavoriteButton.tsx
'use client';

import { useState } from 'react';

interface FavoriteButtonProps {
  listingId?: string;
  userId?: string;
  initialIsFavorited?: boolean;
}

export default function FavoriteButton({ listingId, userId, initialIsFavorited = false }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [loading, setLoading] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);

    try {
      // Use single /api/favorites endpoint and pass either listingId or userId (targetUserId)
      const body = listingId ? { listingId } : { targetUserId: userId };

      const res = await fetch('/api/favorites', {
        method: isFavorited ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsFavorited(!isFavorited);
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleFavorite}
      disabled={loading}
      className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm border border-slate-200 transition-all text-slate-600 hover:text-rose-500 cursor-pointer"
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <span className="text-base">{isFavorited ? '❤️' : '🤍'}</span>
    </button>
  );
}