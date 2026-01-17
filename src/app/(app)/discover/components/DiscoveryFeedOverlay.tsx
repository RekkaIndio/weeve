"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from "lucide-react";
import FeedItem from "@/app/components/FeedItem";
import type { Story } from '@/lib/store';
import { useVideoExportOptional } from '@/app/components/VideoExport/VideoExportContext';

interface DiscoveryFeedOverlayProps {
    stories: Story[];
    initialIndex: number;
    onClose: () => void;
}

export default function DiscoveryFeedOverlay({ stories, initialIndex, onClose }: DiscoveryFeedOverlayProps) {
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // Video export progress - matches AppLayout pattern
    const exportContext = useVideoExportOptional();
    const [showExportBar, setShowExportBar] = useState(false);

    // Track export bar visibility - matches AppLayout
    useEffect(() => {
        if (exportContext?.isExporting) {
            setShowExportBar(true);
        } else if (exportContext?.isComplete) {
            // Keep showing for a moment then hide
            const timer = setTimeout(() => {
                setShowExportBar(false);
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setShowExportBar(false);
        }
    }, [exportContext?.isExporting, exportContext?.isComplete]);


    // Auto-scroll to initial story on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            const el = itemRefs.current.get(initialIndex);
            if (el && containerRef.current) {
                el.scrollIntoView({ behavior: 'instant', block: 'start' });
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [initialIndex]);

    // Intersection observer to track active index
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

        for (const el of itemRefs.current.values()) {
            observer.observe(el);
        }

        return () => observer.disconnect();
    }, [stories.length]);

    // Custom scroll handling for snap behavior - matches home feed smoothness
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let isScrolling = false;
        let lastWheelTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        const activeIndexRef = { current: activeIndex } as { current: number };

        // Keep activeIndexRef synced
        activeIndexRef.current = activeIndex;

        // Custom easing function for smooth deceleration (ease-out-cubic)
        const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

        // Custom smooth scroll using requestAnimationFrame for consistent behavior
        const smoothScrollTo = (targetY: number, duration: number = 400, onComplete?: () => void) => {
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
                        if (onComplete) onComplete();
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

            // Check if we're scrolling to the clone (last item which is copy of first)
            const isClone = idx === stories.length;

            smoothScrollTo(targetY, 450, () => {
                // If we scrolled to the clone, instantly reset to the real first item
                if (isClone) {
                    container.scrollTop = 0;
                    activeIndexRef.current = 0;
                    // Don't trigger state update here if unnecessary, but we might need to sync UI
                }
            });
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

            // Seamless Loop Logic
            let nextIndex = activeIndexRef.current + dir;

            // Handle Wrap:
            // If going past end (L-1 -> L), allow it (to scroll to clone)
            // If going before start (0 -> -1), strict wrap (fast rewind) for now, or use clone logic if bidirectional implemented

            if (nextIndex >= stories.length) {
                // Going past end -> Scroll to Clone (index = length)
                nextIndex = stories.length;
            } else if (nextIndex < 0) {
                // Scrolling up from top -> Wrap to bottom (Fast Rewind)
                nextIndex = stories.length - 1;
            }

            if (nextIndex !== activeIndexRef.current) {
                activeIndexRef.current = nextIndex; // Optimistic update
                scrollTo(nextIndex);
            }
        };

        const touchStart = (e: TouchEvent) => {
            if (e.touches && e.touches[0]) {
                touchStartX = e.touches[0].clientX;
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
            const dx = touch.clientX - touchStartX;
            const dy = touchStartY - touch.clientY;
            const dt = Date.now() - touchStartTime;
            const velocity = Math.abs(dy / Math.max(1, dt));

            // If swipe is more horizontal than vertical, let FeedItem handle it
            // This prevents horizontal swipes from accidentally scrolling to other posts
            if (Math.abs(dx) > Math.abs(dy)) {
                return;
            }

            // Threshold distance of 50px or velocity of 0.3 qualifies as a vertical swipe
            if (Math.abs(dy) < 50 && velocity < 0.3) {
                // not a confident swipe — stay on current index (no snap-back animation needed)
                return;
            }

            const dir = dy > 0 ? 1 : -1;

            // Seamless Loop Logic matches wheel handler
            let nextIndex = activeIndexRef.current + dir;

            if (nextIndex >= stories.length) {
                nextIndex = stories.length;
            } else if (nextIndex < 0) {
                nextIndex = stories.length - 1;
            }

            if (nextIndex !== activeIndexRef.current) {
                activeIndexRef.current = nextIndex;
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
    }, [stories.length, activeIndex]);

    // Prevent body scroll when overlay is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <div
            className="fixed left-0 right-0 top-0 z-50 bg-black"
            style={{ bottom: 'calc(3.25rem + env(safe-area-inset-bottom, 0px))' }}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 left-4 z-[60] p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Scrollable feed container */}
            <div
                ref={containerRef}
                className="h-full w-full overflow-hidden scrollbar-hide"
            >
                {stories.map((story, index) => (
                    <div
                        key={story.id}
                        ref={(el) => {
                            if (el) itemRefs.current.set(index, el);
                            else itemRefs.current.delete(index);
                        }}
                        className="h-full w-full shrink-0"
                        data-index={index}
                    >
                        {/* 
                           Render condition: 
                           1. Standard proximity check (current index +/- 1)
                           2. Edge case: If at Clone (length), render Real 0 (index 0) so it's ready for jump
                        */}
                        {Math.abs(index - activeIndex) <= 1 || (activeIndex === stories.length && index === 0) ? (
                            <FeedItem story={story} isActive={index === activeIndex} />
                        ) : (
                            <div className="h-full w-full bg-black" />
                        )}
                    </div>
                ))}

                {/* Clone of First Story for Seamless Loop */}
                {stories.length > 0 && (
                    <div
                        key="seamless-clone-first"
                        ref={(el) => {
                            if (el) itemRefs.current.set(stories.length, el);
                            else itemRefs.current.delete(stories.length);
                        }}
                        className="h-full w-full shrink-0"
                        data-index={stories.length}
                    >
                        {/* 
                            Logic for visibility/playback of clone:
                            It should be active ONLY if we are physically at the clone index (stories.length)
                        */}
                        <FeedItem
                            story={stories[0]}
                            isActive={activeIndex === stories.length}
                        />
                    </div>
                )}
            </div>

            {/* Export Progress Bar - at bottom edge of overlay (which is now at nav top) */}
            {showExportBar && exportContext && (
                <div
                    className="absolute left-0 right-0 bottom-0 h-[2px] bg-gray-800 z-[60] overflow-hidden"
                >
                    <div
                        className={`h-full transition-all duration-300 ease-out ${exportContext.isComplete ? 'bg-green-500' : 'bg-[#EC1D99]'}`}
                        style={{ width: `${exportContext.progress}%` }}
                    />
                    {exportContext.isExporting && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    )}
                </div>
            )}
        </div>
    );
}
