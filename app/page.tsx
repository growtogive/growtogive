'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole?.toUpperCase() === 'ADMIN';

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Top Navigation */}
      <header className="w-full bg-white border-b-2 border-blue-500 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-black tracking-tight text-slate-900">GrowToGive</span>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Link
                  href="/admin/posts/new"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
                >
                  + Create Admin Post
                </Link>
                <Link
                  href="/admin/posts"
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Manage Posts
                </Link>
              </>
            )}
            <Link
              href="/marketplace"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
            >
              Marketplace →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-10 space-y-8">
        
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Announcements &amp; Posts</h1>
            <p className="text-xs text-slate-500 mt-0.5">Official community announcements, quizzes, and events.</p>
          </div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Feed</span>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-sm font-medium shadow-xs">
            No posts available right now. {isAdmin && 'Click "+ Create Admin Post" above to publish one!'}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post: any) => {
              const previewImg = (post.images && post.images.length > 0) ? post.images[0] : null;

              return (
                <div key={post.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4 hover:border-slate-300 transition-all">
                  
                  {/* Header info & Admin Controls */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 uppercase tracking-wider">
                      {post.category?.name || 'Announcement'}
                    </span>
                    
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/posts/${post.id}/edit`}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-xs cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Post Card Content linking to detail page */}
                  <Link href={`/posts/${post.id}`} className="block space-y-3 group">
                    <h2 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                      {post.title}
                    </h2>

                    {previewImg && (
                      <div className="h-48 w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                        <img src={previewImg} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    )}

                    <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                      {post.description}
                    </p>
                  </Link>

                  <div className="pt-2 border-t flex items-center justify-between text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-3">
                      {post.quiz && <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">🧠 Quiz Attached ({post.quiz.rewardAmount} GB)</span>}
                      {post.event && <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">📅 Event Attached ({post.event.rewardAmount} GB)</span>}
                    </div>
                    <Link href={`/posts/${post.id}`} className="text-emerald-600 hover:underline font-bold">
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