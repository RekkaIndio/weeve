'use client'

import React, { useEffect, useState } from 'react'
import { Heart, MessageSquare, Share2 } from 'lucide-react'

type Post = {
  id: string
  content: string
  imageUrl?: string
  author?: { name?: string }
  createdAt: string
  likes?: number
  comments?: number
  liked?: boolean
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function Avatar({ name }: { name?: string }) {
  const initials = name ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'U'
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white bg-opacity-20 text-white text-sm font-bold border border-white border-opacity-50">
      {initials}
    </div>
  )
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const stories = [
    { id: 's1', name: 'Alice' },
    { id: 's2', name: 'Bob' },
    { id: 's3', name: 'Carol' },
    { id: 's4', name: 'David' },
    { id: 's5', name: 'Emma' },
  ] as { id: string; name: string }[]

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/posts')
        const data = (await res.json()) as Post[]
        setPosts((data || []).map((p: Post) => ({ ...p, likes: p.likes ?? 0, comments: p.comments ?? 0, liked: false })))
      } catch {
        // Fallback mock posts (for local dev without DB)
        setPosts([
          {
            id: 'p1',
            author: { name: 'Alice Johnson' },
            content: 'Welcome to Weeve! Start by adding a weeve or inviting friends to join your story.',
            imageUrl: '/story1.svg',
            createdAt: new Date().toISOString(),
            likes: 4,
            comments: 2,
            liked: false,
          },
          {
            id: 'p2',
            author: { name: 'Bob Smith' },
            content: "Here's a short story beginning. Add your own weeve!",
            imageUrl: '/story2.svg',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            likes: 9,
            comments: 1,
            liked: false,
          },
        ])
      }
    })()
  }, [])

  const toggleLike = async (id: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: (p.liked ? (p.likes || 0) - 1 : (p.likes || 0) + 1) } : p)))
    // Optionally send to server
    // await fetch(`/api/posts/${id}/like`, { method: 'POST' })
  }

  const handleShare = async (postId: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/posts/${postId}`
    try {
      const nav = navigator as unknown as { share?: (data: { title?: string; url?: string }) => Promise<void> }
      if (typeof nav.share === 'function') {
        await nav.share({ title: 'Weeve Post', url })
      } else {
        await navigator.clipboard.writeText(url)
        alert('Link copied to clipboard')
      }
    } catch {
      alert('Unable to share at this time')
    }
  }

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory">
      <div className="flex flex-col">
        {posts.map((post) => (
          <article key={post.id} className="relative h-screen snap-start">
            {post.imageUrl && (
              <>
                <img src={post.imageUrl} className="absolute inset-0 w-full h-full object-cover z-0" alt="story image" />
                <div className="absolute inset-0 bg-black bg-opacity-25 z-10"></div>
              </>
            )}
            <div className="relative z-20 h-full flex flex-col text-white">
              <header className="flex items-center gap-3 p-4">
                <Avatar name={post.author?.name} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>{post.author?.name || 'Unknown'}</div>
                      <div className="text-xs opacity-80">{timeAgo(post.createdAt)}</div>
                    </div>
                  </div>
                </div>
              </header>
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center whitespace-pre-wrap text-xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>{post.content}</div>
              </div>
              <footer className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-2 ${post.liked ? 'text-[#EC1D99]' : ''}`}>
                    <Heart className="w-6 h-6" />
                    <span>{post.likes || 0}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    <span>{post.comments || 0}</span>
                  </div>
                  <button onClick={() => handleShare(post.id)} className="flex items-center gap-2">
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
                <button className="text-xs opacity-80">Add to story</button>
              </footer>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
