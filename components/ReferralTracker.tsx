// components/ReferralTracker.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const refId = searchParams.get('ref');
    if (!refId) return;

    // Set a cookie for the signup bonus (lasts 30 days: 30 days * 24 hours * 60 mins * 60 secs)
    document.cookie = `growtogive_ref=${refId}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    console.log('Referral cookie set successfully for ref:', refId);

    // Trigger visit reward API (protected against spam using sessionStorage)
    const visitedKey = `ref_visited_${refId}`;
    if (!sessionStorage.getItem(visitedKey)) {
      sessionStorage.setItem(visitedKey, 'true');

      fetch('/api/referrals/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referrerId: refId }),
      }).catch((err) => {
        console.error('Failed to log referral visit:', err);
      });
    }
  }, [searchParams]);

  return null;
}