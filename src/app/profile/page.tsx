import React from 'react';
import { Settings, Edit, Heart, MessageSquare, Share2 } from 'lucide-react';

export default function ProfilePage() {
  // Mock user data - in real app, fetch from API/auth
  const user = {
    name: 'Alex Rivera',
    username: '@alexrivera',
    bio: 'Storyteller at heart. Love weaving tales with friends. 📖✨',
    avatar: null, // or a URL
    stats: {
      posts: 24,
      followers: 156,
      following: 89,
    },
  };

  // Mock posts - in real app, fetch user's posts
  const userPosts = [
    {
      id: '1',
      content: 'Just finished an amazing collaborative story with my friends! The twists and turns were incredible. #WeeveStories',
      createdAt: '2024-11-15T10:30:00Z',
      likes: 12,
      comments: 5,
    },
    {
      id: '2',
      content: 'Starting a new mystery story. Who wants to join? 🕵️‍♀️',
      createdAt: '2024-11-10T14:20:00Z',
      likes: 8,
      comments: 3,
    },
    {
      id: '3',
      content: 'The power of collective creativity never ceases to amaze me. Each weeve adds something unique.',
      createdAt: '2024-11-05T09:15:00Z',
      likes: 15,
      comments: 7,
    },
  ];

  function timeAgo(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  function Avatar({ name, size = 'large' }: { name: string; size?: 'small' | 'large' }) {
    const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
    const sizeClass = size === 'large' ? 'w-20 h-20' : 'w-10 h-10';
    return (
      <div className={`${sizeClass} rounded-full flex items-center justify-center bg-[#FDF2F8] text-sm font-bold text-[#1F2937] border-2 border-[#E5E7EB]`}>
        {initials}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB] px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#9333EA]" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Profile
        </h1>
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <Settings className="w-6 h-6 text-[#6B7280]" />
        </button>
      </header>

      {/* Profile Header */}
      <section className="bg-white px-4 py-6 border-b border-[#E5E7EB]">
        <div className="flex items-start gap-4">
          <Avatar name={user.name} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {user.name}
                </h2>
                <p className="text-sm text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {user.username}
                </p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#EC1D99] text-white rounded-lg font-medium hover:bg-[#D41C84] transition-colors">
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>
            <p className="text-sm text-[#1F2937] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              {user.bio}
            </p>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-lg font-bold text-[#1F2937]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {user.stats.posts}
                </div>
                <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Posts
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#1F2937]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {user.stats.followers}
                </div>
                <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Followers
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#1F2937]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {user.stats.following}
                </div>
                <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Following
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Posts Section */}
      <section className="px-4 py-6">
        <h3 className="text-lg font-bold text-[#1F2937] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Your Posts
        </h3>
        <div className="space-y-4">
          {userPosts.map((post) => (
            <article key={post.id} className="bg-white rounded-lg p-4 shadow-sm border border-[#E5E7EB]">
              <div className="flex items-start gap-3 mb-3">
                <Avatar name={user.name} size="small" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[#1F2937]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {user.name}
                    </span>
                    <span className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {timeAgo(post.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[#1F2937] whitespace-pre-wrap" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {post.content}
                  </p>
                </div>
              </div>
              <footer className="flex items-center justify-between text-sm text-[#6B7280]">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 hover:text-[#EC1D99] transition-colors">
                    <Heart className="w-4 h-4" />
                    <span>{post.likes}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.comments}</span>
                  </div>
                  <button className="flex items-center gap-2 hover:text-[#EC1D99] transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
        {userPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#FDF2F8] flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-[#EC1D99]" />
            </div>
            <h4 className="text-lg font-medium text-[#1F2937] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              No posts yet
            </h4>
            <p className="text-sm text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Share your first story or weeve to get started!
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
