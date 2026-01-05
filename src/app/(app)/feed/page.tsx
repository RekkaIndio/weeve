"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import FeedItem from "@/app/components/FeedItem";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { fetchGroups } from "@/lib/data";
import { rankFeedStories } from "@/lib/discovery/feed-algorithm";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { stories, fetchStories, fetchMoreStories, hasMoreStories, currentUser, setGroups, fetchFriends, isStoriesLoading, groups, reportedStoryIds } = useStore();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Force refresh key - changing this forces React to re-render
  const [forceRefreshKey, setForceRefreshKey] = useState(0);

  // Check for payment success query param
  useEffect(() => {
    // Clear auth redirect flag on feed load (prevents blocking future logins)
    sessionStorage.removeItem('weeve_auth_redirecting');

    const paymentStatus = searchParams?.get('payment');
    if (paymentStatus === 'success') {
      // toast removed
      // Remove query param from URL
      router.replace('/feed', { scroll: false });
    }
  }, [searchParams, router]);





  // ===== CONSOLIDATED DATA FETCH =====
  // Single orchestrated fetch that handles session check and data loading
  // Track which user we've fetched for to prevent duplicate fetches but allow refetch on user change
  const fetchedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) {
      console.log('[Feed] Auth still loading, waiting...');
      return;
    }

    // If no auth user, redirect handled by another effect
    if (!user) {
      console.log('[Feed] No user, skipping fetch');
      return;
    }

    // If we've already fetched for this user, skip
    if (fetchedForUserRef.current === user.id) {
      console.log('[Feed] Already fetched for user', user.id);
      return;
    }

    let cancelled = false;

    const fetchAllData = async () => {
      fetchedForUserRef.current = user.id;
      console.log('[Feed] Starting consolidated data fetch for user:', user.id);

      try {
        // Fetch stories first (critical path)
        await fetchStories();
        console.log('[Feed] Stories fetched successfully');

        // Then fetch secondary data in parallel (non-blocking)
        if (!cancelled) {
          Promise.allSettled([
            fetchGroups(user.id).then(groups => setGroups(groups)),
            fetchFriends(),
          ]).catch(err => console.warn('[Feed] Secondary data fetch warning:', err));
        }

        console.log('[Feed] Consolidated data fetch complete');
      } catch (err) {
        console.error('[Feed] Fetch error:', err);
        // Reset ref so we can retry
        fetchedForUserRef.current = null;
      }
    };

    fetchAllData();

    return () => { cancelled = true; };
  }, [loading, user, fetchStories, setGroups, fetchFriends]);

  // Tab state for feed organization
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    // Allow refresh if we have an auth user, even if currentUser isn't set yet
    if (isRefreshing || !user) return;

    setIsRefreshing(true);
    console.log('[Feed] Pull-to-refresh triggered');

    try {
      await Promise.all([
        fetchStories(),
        fetchGroups(user.id).then(groups => setGroups(groups)),
        fetchFriends(),
      ]);
      console.log('[Feed] Refresh complete');
    } catch (error) {
      console.error('[Feed] Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, user, fetchStories, setGroups, fetchFriends]);



  // Rank and filter stories using the harmonious feed algorithm
  // This handles:
  // - Fork spacing (min 5 positions between forks of same root)
  // - Diversity limits (max 3 forks per root, max 2 in top 20)
  // - Score-based ranking with engagement and recency
  // - Following vs For You filtering
  const filteredStories = useMemo(() => {
    // Get group membership IDs for filtering
    const groupMembershipIds = new Set(groups.map(g => g.id));

    // Get friend list from store
    const friends = useStore.getState().friends;

    return rankFeedStories(stories, {
      feedType: activeTab,
      currentUserId: currentUser?.id,
      friends: friends,
      groupMembershipIds,
      reportedStoryIds,
      config: {
        forkSpacing: 5,
        maxForksPerRoot: 3,
        maxForksInTop20: 2,
        originalPostBoost: 50,
        prioritizeOriginals: true,
      },
    });
  }, [stories, activeTab, currentUser?.id, groups, reportedStoryIds]);

  // ===== AUTOMATIC INFINITE SCROLL =====
  // Auto-load more stories when approaching the end of the feed
  useEffect(() => {
    const LOAD_MORE_THRESHOLD = 3; // Load more when within 3 stories of end
    const storiesRemaining = filteredStories.length - activeIndex;

    if (storiesRemaining <= LOAD_MORE_THRESHOLD && hasMoreStories && !isStoriesLoading) {
      console.log(`[Feed] Auto-loading more stories (${storiesRemaining} remaining)`);
      fetchMoreStories();
    }
  }, [activeIndex, filteredStories.length, hasMoreStories, isStoriesLoading, fetchMoreStories]);


  // Re-calculate active index when changing tabs to prevent index out of bounds
  useEffect(() => {
    setActiveIndex(0);
  }, [activeTab]);

  // ===== FORCE INITIAL RENDER AFTER STORIES LOAD =====
  // After OAuth redirect, the feed container may not render properly until user interaction.
  // This effect forces a layout recalculation when stories first become available.
  const prevStoriesLengthRef = useRef(0);

  useEffect(() => {
    // Track when we go from 0 stories to having stories
    const hadNoStories = prevStoriesLengthRef.current === 0;
    const hasStoriesNow = filteredStories.length > 0;
    prevStoriesLengthRef.current = filteredStories.length;

    if (hadNoStories && hasStoriesNow && containerRef.current) {
      console.log('[Feed] Stories just loaded, forcing full initialization...');

      // Force activeIndex to 0 to ensure proper rendering
      setActiveIndex(0);

      // Force scroll to top
      containerRef.current.scrollTop = 0;

      // Schedule a second forced update after React has finished the current render cycle
      // This is necessary because the FeedItem components need time to mount
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
          // Force another state update to trigger re-render with all items mounted
          setForceRefreshKey(prev => prev + 1);
        }
      }, 100);

      // Also schedule an observer re-initialization after items are mounted
      requestAnimationFrame(() => {
        if (containerRef.current) {
          // Force the container to recalculate layout
          containerRef.current.style.display = 'none';
          containerRef.current.offsetHeight; // Force reflow
          containerRef.current.style.display = '';
          containerRef.current.scrollTop = 0;
        }
      });

      return () => clearTimeout(timer);
    }
  }, [filteredStories.length]);

  // DEBUG LOGGING - Moved here to have access to all variables
  useEffect(() => {
    console.log('[Feed Page Debug] Status Update:', {
      authLoading: loading,
      isStoriesLoading,
      hasUser: !!user,
      hasCurrentUser: !!currentUser,
      hasFilteredStories: filteredStories.length > 0,
      activeTab
    });
  }, [loading, isStoriesLoading, user, currentUser, filteredStories.length, activeTab]);

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

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
    // But allow interaction with buttons, links, and other interactive elements
    const touchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Check if target or any parent is an interactive element
      const isInteractive = target.closest('button, a, input, textarea, [role="button"]');
      if (!isInteractive) {
        e.preventDefault();
      }
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

  // Force unlock the UI after 200ms if still stuck - show cached content immediately
  const [forceUnlock, setForceUnlock] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[Feed] Force unlock triggered after 200ms');
      setForceUnlock(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Only block on auth loading for a very short time - prefer showing cached content
  // AuthProvider already shows a spinner, so we only block briefly here
  if ((loading || !user) && !forceUnlock && stories.length === 0) {
    console.log('[Feed Page Debug] Render blocked by:', { loading, noUser: !user, isStoriesLoading, forceUnlock, hasCachedStories: stories.length > 0 });
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Tab Switcher */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-center items-center pb-4 pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
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

      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="absolute top-16 left-0 right-0 z-40 flex justify-center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="bg-black/80 backdrop-blur-sm rounded-full p-2">
            <div className="w-6 h-6 border-2 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

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
              <FeedItem key={story.id} story={story} isActive={index === activeIndex} />
            ) : (
              <div className="h-full w-full bg-black" />
            )}
          </div>
        ))}

        {/* End of Feed / Empty State */}
        <div className="h-full flex items-center justify-center bg-black text-gray-500">
          <div className="text-center px-8">
            {filteredStories.length === 0 ? (
              isStoriesLoading ? (
                // Show spinner while loading - prevents flash of "No stories"
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-lg">No stories yet</p>
                  <p className="mb-6 text-sm text-gray-600">
                    {activeTab === 'following'
                      ? "Follow some friends to see their stories here!"
                      : "Be the first to create a story, or check back later!"}
                  </p>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-6 py-3 bg-[#EC1D99] text-white font-bold rounded-full disabled:opacity-50"
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                </>
              )
            ) : hasMoreStories ? (
              // Auto-loading indicator (no button needed - loads automatically)
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-[#EC1D99] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-400">Loading more stories...</p>
              </div>
            ) : (
              <>
                <p className="mb-4">You&apos;re all caught up!</p>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-[#EC1D99] font-bold disabled:opacity-50"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh feed'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>


    </>
  );
}
