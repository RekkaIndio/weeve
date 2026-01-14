'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { fetchGroups } from '@/lib/data';

// Refresh intervals
const ACTIVE_POLLING_INTERVAL_MS = 30 * 1000; // 30 seconds when app is active
const BACKGROUND_RETURN_DEBOUNCE_MS = 500; // Debounce rapid focus/visibility events

/**
 * Custom hook for handling global data refresh across the application.
 * 
 * This hook provides:
 * 1. Periodic polling when the app is active (every 30 seconds)
 * 2. Immediate refresh when app returns from background (native & web)
 * 3. Refresh on visibility change (tab focus, document visibility)
 * 4. Works with Supabase real-time subscriptions as a fallback/supplement
 */
export function useDataRefresh() {
    const pathname = usePathname();
    const { currentUser, fetchStories, fetchDiscoveryStories, setGroups, fetchFriends, isStoriesLoading } = useStore();
    const lastRefreshRef = useRef<number>(0);
    const isRefreshingRef = useRef(false);
    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Core refresh function with debouncing and lock to prevent simultaneous calls
    const refreshData = useCallback(async (source: string = 'unknown') => {
        // Skip if no user logged in
        if (!currentUser) {
            return;
        }

        // Debounce: Don't refresh if we just did within the debounce window
        const now = Date.now();
        if (now - lastRefreshRef.current < BACKGROUND_RETURN_DEBOUNCE_MS) {
            console.log(`[DataRefresh] Skipping refresh from ${source} - debounced`);
            return;
        }

        // Lock: Don't refresh if already refreshing OR if the store is loading stories (critical path)
        if (isRefreshingRef.current || isStoriesLoading) {
            console.log(`[DataRefresh] Skipping refresh from ${source} - already in progress (local=${isRefreshingRef.current}, store=${isStoriesLoading})`);
            return;
        }

        try {
            isRefreshingRef.current = true;
            lastRefreshRef.current = now;
            console.log(`[DataRefresh] Refreshing data from ${source}...`);

            // Fetch all data in parallel for speed
            const isDiscovery = pathname === '/discover';
            const results = await Promise.allSettled([
                isDiscovery ? fetchDiscoveryStories() : fetchStories(),
                fetchGroups(currentUser?.id).then(groups => setGroups(groups)),
                fetchFriends(),
            ]);

            // Log any failures
            results.forEach((result, index) => {
                const labels = ['stories', 'groups', 'friends'];
                if (result.status === 'rejected') {
                    console.warn(`[DataRefresh] Failed to fetch ${labels[index]}:`, result.reason);
                }
            });

            console.log(`[DataRefresh] Refresh complete from ${source}`);
        } catch (error) {
            console.error('[DataRefresh] Error during refresh:', error);
        } finally {
            isRefreshingRef.current = false;
        }
    }, [currentUser, fetchStories, fetchDiscoveryStories, setGroups, fetchFriends, isStoriesLoading, pathname]);

    // Set up Capacitor app state listener for native platforms
    useEffect(() => {
        if (!currentUser) return;

        let appStateCleanup: (() => void) | undefined;

        const setupNativeListener = async () => {
            if (!Capacitor.isNativePlatform()) return;

            try {
                const { App } = await import('@capacitor/app');
                const listener = await App.addListener('appStateChange', (state) => {
                    if (state.isActive) {
                        console.log('[DataRefresh] App became active (native)');
                        // Clear any pending debounce
                        if (debounceTimeoutRef.current) {
                            clearTimeout(debounceTimeoutRef.current);
                        }
                        // Small delay to let the app fully resume
                        debounceTimeoutRef.current = setTimeout(() => {
                            refreshData('app-resume');
                        }, 300);
                    }
                });
                appStateCleanup = () => listener.remove();
                console.log('[DataRefresh] Native app state listener attached');
            } catch (error) {
                console.warn('[DataRefresh] Failed to set up native app state listener:', error);
            }
        };

        setupNativeListener();

        return () => {
            if (appStateCleanup) {
                appStateCleanup();
            }
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [currentUser, refreshData]);

    // Set up web visibility/focus handlers
    useEffect(() => {
        if (!currentUser) return;
        if (typeof window === 'undefined') return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[DataRefresh] Page became visible');
                // Clear any pending debounce
                if (debounceTimeoutRef.current) {
                    clearTimeout(debounceTimeoutRef.current);
                }
                debounceTimeoutRef.current = setTimeout(() => {
                    refreshData('visibility-change');
                }, 300);
            }
        };

        const handleFocus = () => {
            console.log('[DataRefresh] Window focused');
            // Clear any pending debounce
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            debounceTimeoutRef.current = setTimeout(() => {
                refreshData('window-focus');
            }, 300);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        console.log('[DataRefresh] Web visibility/focus listeners attached');

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [currentUser, refreshData]);

    // Set up periodic polling
    useEffect(() => {
        if (!currentUser) return;

        console.log(`[DataRefresh] Starting periodic polling every ${ACTIVE_POLLING_INTERVAL_MS / 1000}s`);
        
        pollingIntervalRef.current = setInterval(() => {
            // Only poll if the page is visible (save battery/data on mobile)
            if (document.visibilityState === 'visible') {
                refreshData('periodic-poll');
            }
        }, ACTIVE_POLLING_INTERVAL_MS);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            console.log('[DataRefresh] Periodic polling stopped');
        };
    }, [currentUser, refreshData]);

    return { refreshData };
}
