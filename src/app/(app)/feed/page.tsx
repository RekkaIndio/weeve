"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import FeedItem from "@/app/components/FeedItem";
import FeedOnboardingOverlay from "@/app/components/FeedOnboardingOverlay";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { fetchGroups } from "@/lib/data";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { stories, fetchStories, currentUser, setGroups, fetchFriends, isStoriesLoading, groups } = useStore();
  const [showOnboardingOverlay, setShowOnboardingOverlay] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Force refresh key - changing this forces React to re-render
  const [forceRefreshKey, setForceRefreshKey] = useState(0);

  // Check for payment success query param
  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Payment successful! Your brand story is now live.');
      // Remove query param from URL
      router.replace('/feed', { scroll: false });
    }
  }, [searchParams, router]);






  // CRITICAL: Force a full page reload after OAuth redirect to wake up the WebView
  // But skip if user needs onboarding (let AuthProvider handle redirect)
  useEffect(() => {
    const oauthReloadKey = 'weeve_oauth_needs_reload';
    const wasOAuthRedirect = sessionStorage.getItem(oauthReloadKey);

    if (wasOAuthRedirect) {
      console.log('[Feed] OAuth redirect detected, removing flag');
      sessionStorage.removeItem(oauthReloadKey);
      // Don't reload again - flag was already consumed
    } else {
      // Quick check - reload immediately if stories are empty
      const timer = setTimeout(() => {
        // Skip reload if user might need onboarding (AuthProvider will handle)
        const storeState = useStore.getState();
        const userProfile = storeState.currentUser;

        // If no profile or stories are empty, might need reload
        // But if this is a new user (no stories expected), skip reload
        if (storeState.stories.length === 0 && userProfile) {
          console.log('[Feed] No stories loaded, forcing page reload...');
          sessionStorage.setItem(oauthReloadKey, 'true');
          window.location.reload();
        }
      }, 100); // Very fast check - 100ms

      return () => clearTimeout(timer);
    }
  }, []);

  // Force fetch on mount - quick delay
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await fetchStories();
        fetchGroups(user?.id).then(groups => setGroups(groups));
        fetchFriends();
      } catch (err) {
        console.error('[Feed] Fetch error:', err);
      }
    }, 0); // Immediate
    return () => clearTimeout(timer);
  }, [fetchStories, setGroups, fetchFriends]);

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

  // Filter stories based on active tab
  const filteredStories = stories.filter(story => {
    // Group content check - only show if user is a member of the group
    // This is a secondary safeguard (primary filter is in fetchStories)
    if (story.groupId) {
      const isMemberOfGroup = groups.some(g => g.id === story.groupId);
      if (!isMemberOfGroup) {
        return false;
      }
    }

    // Global filter: Private stories should only be visible to participants
    if (story.visibility === 'private') {
      if (!currentUser) return false;
      // Only show if current user is the creator OR a participant
      const isCreator = story.creatorId === currentUser.id;
      const isParticipant = (story.participants ?? []).some((p: any) => p.id === currentUser.id);
      if (!isCreator && !isParticipant) {
        return false;
      }
      // Additional filter: exclude if user is a "waiting" participant (these go to Waiting tab)
      const isWaitingForCurrentUser = (story.participants ?? []).some((p: any) => p.id === currentUser.id && p.status === 'waiting');
      if (isWaitingForCurrentUser) {
        return false;
      }
    }

    if (activeTab === 'foryou') {
      // For You: Show all public stories, plus private ones the user is involved in (already filtered above)
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

  // Fetch stories when authenticated user is available
  // We use `user` (auth user) as the trigger, not `currentUser` (store user)
  // because currentUser might not be set yet due to race conditions after login
  useEffect(() => {
    if (user) {
      console.log('[Feed] User authenticated, fetching stories...');
      fetchStories();
    }
  }, [user, fetchStories]);

  // Also check session on mount - handles the case where the page loads
  // after a full redirect (window.location.replace) and user state hasn't propagated yet
  useEffect(() => {
    let cancelled = false;

    const checkSessionAndFetch = async () => {
      // Retry multiple times with increasing delays
      // Session might not be immediately available after login redirect
      const maxAttempts = 5;
      const delays = [100, 200, 300, 500, 1000]; // Standard delays

      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt++) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) console.warn(`[Feed] Session check error (attempt ${attempt + 1}):`, sessionError);

          if (session?.user) {
            console.log(`[Feed] Session found on mount (attempt ${attempt + 1}), fetching data for user: ${session.user.id}`);

            // Log access token presence (don't log full token)
            console.log(`[Feed] Access token present: ${!!session.access_token}`);

            // Serialize fetches to avoid overwhelming the cold connection
            await fetchStories();

            // Queue secondary fetches in background (don't await them for the retry loop)
            Promise.allSettled([
              fetchGroups(session.user.id).then(groups => setGroups(groups)),
              fetchFriends(),
            ]).catch(err => console.warn('[Feed] Secondary data fetch warning:', err));

            console.log('[Feed] Mount-time data fetch triggered');
            return; // Success, exit the retry loop
          } else {
            console.log(`[Feed] No session on attempt ${attempt + 1}, retrying...`);
          }
        } catch (err) {
          console.warn(`[Feed] Session check attempt ${attempt + 1} failed:`, err);
        }

        // Wait before next attempt
        if (attempt < maxAttempts - 1 && !cancelled) {
          await new Promise(r => setTimeout(r, delays[attempt]));
        }
      }

      console.warn('[Feed] All session check attempts exhausted');
    };

    // Run immediately on mount
    checkSessionAndFetch();

    return () => { cancelled = true; };
  }, [fetchStories, setGroups, fetchFriends]);

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
              <FeedItem key={story.id} story={story} />
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
