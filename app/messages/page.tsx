'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [received, setReceived] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  
  // Reply Modal state
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchMessages();
      markAsRead();
    }
  }, [status]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load messages');
      setReceived(data.received || []);
      setSent(data.sent || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch('/api/messages', { method: 'PUT' });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyContent.trim()) return;

    setSendingReply(true);
    setReplyError('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: replyingTo.listingId,
          receiverId: replyingTo.senderId,
          content: replyContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply.');

      setReplyContent('');
      setReplyingTo(null);
      fetchMessages();
      alert('Reply sent successfully!');
    } catch (err: any) {
      setReplyError(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">Loading messages...</div>;
  }

  const messagesList = activeTab === 'received' ? received : sent;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <header className="w-full bg-white border-b-2 border-emerald-500 sticky top-0 z-40 shadow-sm">
        <div className="w-full mx-auto px-4 py-3.5 flex justify-between items-center" style={{ maxWidth: '750px' }}>
          <Link href="/marketplace" className="flex items-center gap-2.5">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-black tracking-tight text-slate-900">GrowToGive</span>
          </Link>
          <Link href="/profile" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all">
            ← Back to Profile
          </Link>
        </div>
      </header>

      <main className="w-full mx-auto px-4 pt-8 space-y-6" style={{ maxWidth: '750px' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Your Messages</h1>
            <p className="text-xs text-slate-500 mt-0.5">Secure internal communications regarding marketplace listings.</p>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('received')}
              className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'received' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              Inbox ({received.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'sent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              Sent ({sent.length})
            </button>
          </div>
        </div>

        {messagesList.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-sm font-medium">
            No messages found in your {activeTab}.
          </div>
        ) : (
          <div className="space-y-4">
            {messagesList.map((msg: any) => {
              const otherUser = activeTab === 'received' ? msg.sender : msg.receiver;
              const formattedDate = new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

              return (
                <div key={msg.id} className={`bg-white rounded-2xl border p-6 shadow-xs space-y-3 transition-all ${activeTab === 'received' && !msg.isRead ? 'border-emerald-400 bg-emerald-50/20 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md uppercase">
                        Listing: {msg.listing?.title || 'Marketplace Item'}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-2">
                        {activeTab === 'received' ? `From: ${otherUser?.name || 'Member'}` : `To: ${otherUser?.name || 'Member'}`}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{formattedDate}</span>
                  </div>

                  <p className="text-slate-700 text-sm bg-slate-50 border border-slate-100 p-4 rounded-xl whitespace-pre-line leading-relaxed">
                    {msg.content}
                  </p>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                    <Link href={`/listings/${msg.listingId}`} className="text-blue-600 hover:underline font-bold">
                      View Listing ↗
                    </Link>
                    {activeTab === 'received' && (
                      <button
                        onClick={() => {
                          setReplyingTo({ listingId: msg.listingId, senderId: msg.senderId, recipientName: msg.sender?.name, listingTitle: msg.listing?.title });
                          setReplyContent('');
                          setReplyError('');
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Reply Modal */}
      {replyingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full shadow-2xl relative space-y-4">
            <button onClick={() => setReplyingTo(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-xl">×</button>
            <h3 className="text-xl font-black text-slate-900">Reply to {replyingTo.recipientName}</h3>
            <p className="text-xs text-slate-500">Regarding: <span className="font-bold text-slate-700">{replyingTo.listingTitle}</span></p>

            {replyError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{replyError}</div>}

            <form onSubmit={handleSendReply} className="space-y-4">
              <textarea
                rows={4}
                required
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                className="w-full px-4 py-3 border border-slate-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReplyingTo(null)} className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">Cancel</button>
                <button type="submit" disabled={sendingReply} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                  {sendingReply ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}