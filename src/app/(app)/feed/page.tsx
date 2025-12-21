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

  // Tab state for feed organization
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');

  // Filter stories based on active tab
  const filteredStories = stories.filter(story => {
    if (activeTab === 'foryou') {
      // For You: Show all public stories, plus private ones I'm involved in
      // For this MVP, we show everything in "For You" to maximize discovery, 
      // but ideally this would be algorithmically sorted.
      return true;
    } else {
      // Following: Only show stories from friends
      if (!currentUser) return false;
      // Include my own stories
      if (story.creatorId === currentUser.id) return true;
      // Include stories from friends
      // We need to check if we follow the creator. 
      // Assuming 'friends' in store are people I follow/am friends with.
      const friendIds = useStore.getState().friends.map(f => f.id);
      return friendIds.includes(story.creatorId);
    }
  });

  // Re-calculate active index when changing tabs to prevent index out of bounds
  useEffect(() => {
    setActiveIndex(0);
  }, [activeTab]);

  // Preload adjacent stories' videos to speed up transitions (uses global cache)
  useEffect(() => {
    const toPrefetch = [activeIndex + 1, activeIndex + 2];
    for (const idx of toPrefetch) {
      const s = filteredStories[idx];
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
            v.muted = false;
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
  }, [activeIndex, filteredStories]);

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

        // Respect local dismissal flag so overlay doesn't reappear after user dismisses it
        let dismissed = false;
        try {
          if (typeof window !== 'undefined') {
            dismissed = !!localStorage.getItem('weeve_onboarding_overlay_dismissed_' + currentUser.id);
          }
        } catch (err) { dismissed = false; }

        // Show overlay if they just created their onboarding story and haven't dismissed it
        if (data && data.onboarding_step === 2 && !data.completed_onboarding && !dismissed) {
          setShowOnboardingOverlay(true);
        }
      } catch (err) {
        console.error('[Feed] Error checking onboarding:', err);
      }
    };

    checkOnboarding();
  }, [currentUser?.id]); useEffect(() => {
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
  }, [filteredStories.length]); // Updated dependency

  // Enforce single-step snapping per wheel/touch gesture
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isScrolling = false;
    let lastWheelTime = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const activeIndexRef = { current: activeIndex } as { current: number };
    const updateActiveIndexRef = () => { activeIndexRef.current = activeIndex; };

    // Keep activeIndexRef synced
    updateActiveIndexRef();

    // Custom easing function for smooth deceleration (ease-out-cubic)
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    // Custom smooth scroll using requestAnimationFrame for consistent behavior
    const smoothScrollTo = (targetY: number, duration: number = 400) => {
      const startY = container.scrollTop;
      const distance = targetY - startY;
      const startTime = performance.now();

      // Temporarily disable scroll-snap to prevent it from interfering
      const originalSnapType = container.style.scrollSnapType;
      container.style.scrollSnapType = 'none';

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        container.scrollTop = startY + (distance * easedProgress);

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          // Ensure we land exactly on target
          container.scrollTop = targetY;
          // Re-enable scroll-snap after animation completes
          container.style.scrollSnapType = originalSnapType || 'y mandatory';
          setTimeout(() => {
            isScrolling = false;
          }, 50);
        }
      };

      requestAnimationFrame(animateScroll);
    };

    const scrollTo = (idx: number) => {
      const el = itemRefs.current.get(idx);
      if (!el || !container) return;
      isScrolling = true;

      // Calculate target scroll position
      const targetY = el.offsetTop;
      smoothScrollTo(targetY, 450);
    };

    const wheelHandler = (e: WheelEvent) => {
      if (isScrolling) {
        e.preventDefault();
        return;
      }

      const now = Date.now();
      if (now - lastWheelTime < 120) {
        // throttle rapid wheel events to a single action
        e.preventDefault();
        return;
      }

      lastWheelTime = now;
      const delta = e.deltaY;
      if (Math.abs(delta) < 10) return;

      e.preventDefault();
      const dir = delta > 0 ? 1 : -1;
      const nextIndex = Math.min(Math.max(activeIndexRef.current + dir, 0), Math.max(0, filteredStories.length - 1));
      if (nextIndex !== activeIndexRef.current) {
        scrollTo(nextIndex);
      }
    };

    const touchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    };

    // Prevent native scrolling during touch - we handle it ourselves
    const touchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    const touchEnd = (e: TouchEvent) => {
      if (isScrolling) return;
      const touch = e.changedTouches && e.changedTouches[0];
      if (!touch) return;
      const dy = touchStartY - touch.clientY;
      const dt = Date.now() - touchStartTime;
      const velocity = Math.abs(dy / Math.max(1, dt));

      // Threshold distance of 50px or velocity of 0.3 qualifies as a swipe
      if (Math.abs(dy) < 50 && velocity < 0.3) {
        // not a confident swipe — stay on current index (no snap-back animation needed)
        return;
      }

      const dir = dy > 0 ? 1 : -1;
      const nextIndex = Math.min(Math.max(activeIndexRef.current + dir, 0), Math.max(0, filteredStories.length - 1));
      if (nextIndex !== activeIndexRef.current) {
        scrollTo(nextIndex);
      }
    };

    // Add listeners with passive:false to allow preventDefault
    container.addEventListener('wheel', wheelHandler, { passive: false });
    container.addEventListener('touchstart', touchStart, { passive: true });
    container.addEventListener('touchmove', touchMove, { passive: false });
    container.addEventListener('touchend', touchEnd, { passive: true });

    return () => {
      container.removeEventListener('wheel', wheelHandler);
      container.removeEventListener('touchstart', touchStart);
      container.removeEventListener('touchmove', touchMove);
      container.removeEventListener('touchend', touchEnd);
    };
  }, [filteredStories.length, activeIndex]); // Updated dependency

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
      {/* Floating Tab Switcher */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-center items-center pt-8 pb-4 pointer-events-none">
        <div className="flex gap-4 pointer-events-auto drop-shadow-md">
          <button
            onClick={() => setActiveTab('following')}
            className={`text-base font-bold transition-colors ${activeTab === 'following' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            Following
          </button>
          <div className="w-[1px] h-5 bg-white/20 self-center"></div>
          <button
            onClick={() => setActiveTab('foryou')}
            className={`text-base font-bold transition-colors ${activeTab === 'foryou' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            For You
          </button>
        </div>
      </div>

      <div ref={containerRef} className="h-full w-full overflow-hidden scrollbar-hide">
        {filteredStories.map((story, index) => (
          <div
            key={story.id}
            ref={(el) => {
              if (el) itemRefs.current.set(index, el);
              else itemRefs.current.delete(index);
            }}
            className="h-full shrink-0"
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
        <div className="h-full flex items-center justify-center bg-black text-gray-500">
          <div className="text-center">
            <p className="mb-4">You&apos;re all caught up!</p>
            <button className="text-[#EC1D99] font-bold">Discover more</button>
          </div>
        </div>
      </div>

      {/* Onboarding Tutorial Overlay */}
      {showOnboardingOverlay && (
        <FeedOnboardingOverlay onDismiss={() => {
          try { if (typeof window !== 'undefined' && currentUser?.id) { localStorage.setItem('weeve_onboarding_overlay_dismissed_' + currentUser.id, 'true'); localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + currentUser.id, 'true'); } } catch (err) { }
          setShowOnboardingOverlay(false);
        }} />
      )}
    </>
  );
}
