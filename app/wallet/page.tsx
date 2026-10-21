// app/wallet/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WalletPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleTransactionsCount, setVisibleTransactionsCount] = useState(10);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchWalletData();
    }
  }, [status]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load wallet data.');
      setProfileData(data.user || data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium text-sm">Loading wallet...</div>;
  }

  const rawTransactions = profileData ? [
    ...(profileData.sentTx || []),
    ...(profileData.receivedTx || [])
  ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  const allTransactions = Array.from(
    new Map(rawTransactions.map((tx: any) => [tx.id, tx])).values()
  );

  const currentWalletBalance = Number(profileData?.growbucks || 0);
  const displayedTransactions = allTransactions.slice(0, visibleTransactionsCount);
  const hasMoreTransactions = visibleTransactionsCount < allTransactions.length;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      <main className="w-full pt-4 space-y-6 px-4 sm:px-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">GrowBucks Wallet</h1>
            <p className="text-xs text-slate-500 mt-0.5">Your available balance and complete transfer transaction ledger</p>
          </div>
          <Link href="/profile" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all">
            ← Back to Profile
          </Link>
        </div>

        {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">{error}</div>}

        <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Balance</span>
            <h2 className="text-3xl font-black text-slate-900 mt-1">GB {currentWalletBalance.toFixed(2)}</h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 text-xl font-bold">
            🌱
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Transaction History ({allTransactions.length})</h3>
          
          {allTransactions.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No Growbucks transactions yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {displayedTransactions.map((tx: any) => {
                  const isSelfTransfer = tx.senderId === tx.receiverId;
                  const isSender = isSelfTransfer ? false : (tx.senderId === profileData?.id);
                  const isOutflow = isSender || Number(tx.amount) < 0;
                  const absAmount = Math.abs(Number(tx.amount) || 0).toFixed(2);

                  return (
                    <div key={tx.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{tx.reason}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${
                            tx.type === 'Trade' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            tx.type === 'Referral' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            tx.type === 'Activity' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {tx.type || 'Trade'}
                          </span>
                        </div>
                        <span className="text-slate-500 font-medium block">
                          {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {isOutflow ? `Sent from GTG Admin` : `Received from ${tx.sender?.name || 'Member'}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-black text-sm block ${isOutflow ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isOutflow ? `-${absAmount}` : `+${absAmount}`} GB
                        </span>
                        {tx.commission !== null && tx.commission !== undefined && (
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Commission: GB {Number(tx.commission).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMoreTransactions && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setVisibleTransactionsCount(prev => prev + 10)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer border border-slate-200"
                  >
                    Load Another 10 Transactions ({allTransactions.length - visibleTransactionsCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}