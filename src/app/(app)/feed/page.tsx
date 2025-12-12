"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import FeedItem from "@/app/components/FeedItem";
import FeedOnboardingOverlay from "@/app/components/FeedOnboardingOverlay";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { stories, fetchStories, currentUser } = useStore();
  const [showOnboardingOverlay, setShowOnboardingOverlay] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Preload adjacent stories' videos to speed up transitions (uses global cache)
  useEffect(() => {
    const toPrefetch = [activeIndex + 1, activeIndex + 2];
    for (const idx of toPrefetch) {
      const s = stories[idx];
      if (!s) continue;
      for (const c of s.contributions || []) {
        const url = c.mediaUrl;
        if (!url) continue;
        const isVideo = ['.mp4', '.webm', '.ogg', '.mov'].some(ext => url.toLowerCase().includes(ext));
        if (!isVideo) continue;
        // Use global cache from FeedItem module if available
        (async () => {
          try {
            const globalCache = (globalThis as any).__weeveVideoPreloadCache as Map<string, HTMLVideoElement> | undefined;
            const globalReady = (globalThis as any).__weeveVideoReadyRef as Map<string, boolean> | undefined;
            if (!globalCache) return;
            if (globalCache.has(url)) return;
            const v = document.createElement('video');
            v.src = url;
            v.preload = 'auto';
            v.muted = true;
            v.playsInline = true;
            const handleReady = () => {
              if (globalReady) globalReady.set(url, true);
              v.removeEventListener('canplay', handleReady);
            };
            v.addEventListener('canplay', handleReady);
            v.load();
            globalCache.set(url, v);
          } catch (err) {
            console.debug('[Feed] Prefetch error', err);
          }
        })();
      }
    }
  }, [activeIndex, stories]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (user) {
      fetchStories();
    }
  }, [loading, router, user, fetchStories]);

  // Check if user needs onboarding tutorial
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!currentUser?.id) return;

      try {
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_step, completed_onboarding')
          .eq('user_id', currentUser.id)
          .single();

        // Show overlay if they just created their onboarding story
        if (data && data.onboarding_step === 2 && !data.completed_onboarding) {
          setShowOnboardingOverlay(true);
        }
      } catch (err) {
        console.error('[Feed] Error checking onboarding:', err);
      }
    };

    checkOnboarding();
  }, [currentUser?.id]);

  // Observe currently visible feed item to set activeIndex
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { threshold: 0.6 }
    );

    // Observe all current wrappers
    for (const el of itemRefs.current.values()) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [stories.length]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {stories.map((story, index) => (
          <div
            key={story.id}
            ref={(el) => {
              if (el) itemRefs.current.set(index, el);
              else itemRefs.current.delete(index);
            }}
            className="h-full snap-start shrink-0"
            style={{ scrollSnapStop: 'always' }}
            data-index={index}
          >
            {Math.abs(index - activeIndex) <= 1 ? (
              <FeedItem key={story.id} story={story} />
            ) : (
              <div className="h-full w-full bg-black" />
            )}
          </div>
        ))}

        {/* End of Feed Placeholder */}
        <div className="h-full snap-start flex items-center justify-center bg-black text-gray-500" style={{ scrollSnapStop: 'always' }}>
          <div className="text-center">
            <p className="mb-4">You&apos;re all caught up!</p>
            <button className="text-[#EC1D99] font-bold">Discover more</button>
          </div>
        </div>
      </div>

      {/* Onboarding Tutorial Overlay */}
      {showOnboardingOverlay && (
        <FeedOnboardingOverlay onDismiss={() => setShowOnboardingOverlay(false)} />
      )}
    </>
  );
}
