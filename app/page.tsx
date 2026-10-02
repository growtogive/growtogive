'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = status === 'authenticated' ? (session?.user as any)?.role : null;
  const isAdmin = status === 'authenticated' && userRole?.toString().trim().toUpperCase() === 'ADMIN';

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete post');
      fetchPosts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
        Loading GrowToGive...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 pt-8">
      <main className="max-w-6xl mx-auto px-4">
        {posts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 text-sm font-medium shadow-xs">
            No posts available right now. {status === 'authenticated' && isAdmin && 'Use the "+ New" button on any post card to create one!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {posts.map((post: any) => {
              const previewImg = (post.images && post.images.length > 0) ? post.images[0] : null;

              return (
                <div key={post.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
                  
                  <div className="space-y-3">
                    {previewImg && (
                      <Link href={`/posts/${post.id}`} className="block h-40 w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 group">
                        <img src={previewImg} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </Link>
                    )}

                    <Link href={`/posts/${post.id}`} className="block group">
                      <h2 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
                        {post.title}
                      </h2>
                    </Link>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200 uppercase tracking-wider">
                        {post.category?.name || 'Announcement'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Admin-Only Card Action Bar (New, Edit, Delete) */}
                    {status === 'authenticated' && isAdmin && (
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                        <Link
                          href="/admin/posts/new"
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-[10px]"
                        >
                          + New
                        </Link>
                        <Link
                          href={`/admin/posts/${post.id}/edit`}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px]"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-[10px] cursor-pointer ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    )}

                    <Link href={`/posts/${post.id}`} className="block pt-1">
                      <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                        {post.description}
                      </p>
                    </Link>
                  </div>

                  <div className="pt-4 mt-4 border-t flex items-center justify-between text-xs font-semibold text-slate-500">
                    <div className="flex flex-col gap-1">
                      {post.quiz && <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">🧠 Quiz ({post.quiz.rewardAmount} GB)</span>}
                      {post.event && <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">📅 Event ({post.event.rewardAmount} GB)</span>}
                    </div>
                    <Link href={`/posts/${post.id}`} className="text-emerald-600 hover:underline font-bold text-xs whitespace-nowrap ml-auto">
                      Read More →
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}