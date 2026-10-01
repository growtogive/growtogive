'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminPostsManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole?.toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (session !== undefined && !isAdmin) {
      router.push('/');
      return;
    }
    fetchPosts();
  }, [session, isAdmin]);

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
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading posts dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <header className="w-full bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <Link href="/" className="font-bold text-xs text-slate-600 hover:text-slate-900">← Back to Home</Link>
          <div className="flex gap-2">
            <Link href="/admin/posts/new" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-xs">
              + Create New Post
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-10 space-y-6">
        <h1 className="text-2xl font-black">Manage Admin Posts</h1>

        {posts.length === 0 ? (
          <div className="bg-white border rounded-3xl p-12 text-center text-slate-400 text-sm">No posts found.</div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <div key={post.id} className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border uppercase">
                    {post.category?.name || 'Announcement'}
                  </span>
                  <h3 className="font-black text-base text-slate-900">{post.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{post.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                  >
                    Edit Post
                  </Link>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}