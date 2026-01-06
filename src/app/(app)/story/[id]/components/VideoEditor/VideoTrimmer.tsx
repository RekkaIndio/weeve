"use client";

"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface VideoTrimmerProps {
    videoUrl: string;
    trimStart: number;
    trimEnd: number;
    onTrimChange: (start: number, end: number) => void;
    onScrub?: (time: number) => void;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
    currentTime?: number; // Current playback time from parent (for playhead)
    maxDuration?: number; // Maximum allowed duration in seconds (default: 300 = 5 minutes)
}

const THUMBNAIL_COUNT = 8;
const MIN_TRIM_DURATION = 1; // Minimum 1 second

export function VideoTrimmer({
    videoUrl,
    trimStart,
    trimEnd,
    onTrimChange,
    onScrub,
    onInteractionStart,
    onInteractionEnd,
    currentTime = 0,
    maxDuration = 300
}: VideoTrimmerProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    const [duration, setDuration] = useState(0);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
    const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(true);

    // Local state for smooth visual updates during drag
    const [localStart, setLocalStart] = useState(trimStart);
    const [localEnd, setLocalEnd] = useState(trimEnd);

    // Sync local state with props when not dragging
    useEffect(() => {
        if (!isDragging) {
            setLocalStart(trimStart);
            setLocalEnd(trimEnd);
        }
    }, [trimStart, trimEnd, isDragging]);

    // Generate thumbnails from video
    useEffect(() => {
        if (!videoUrl) return;

        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        const generateThumbnails = async () => {
            setIsGeneratingThumbnails(true);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = 60;
            canvas.height = 80;

            const thumbs: string[] = [];
            const videoDuration = video.duration;

            for (let i = 0; i < THUMBNAIL_COUNT; i++) {
                const time = (videoDuration / THUMBNAIL_COUNT) * i;
                video.currentTime = time;

                await new Promise<void>((resolve) => {
                    const onSeeked = () => {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
                        video.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    video.addEventListener('seeked', onSeeked);
                });
            }

            setThumbnails(thumbs);
            setIsGeneratingThumbnails(false);
        };

        video.onloadedmetadata = () => {
            setDuration(video.duration);
            // Initialize trim end to full duration or max allowed
            if (trimEnd === 0) {
                onTrimChange(0, Math.min(video.duration, maxDuration));
            }
            generateThumbnails();
        };

        video.onerror = () => {
            console.error('[VideoTrimmer] Failed to load video for thumbnails');
            setIsGeneratingThumbnails(false);
        };

        video.src = videoUrl;

        return () => {
            video.src = '';
        };
    }, [videoUrl, maxDuration]);

    // Calculate position from time
    const timeToPercent = useCallback((time: number): number => {
        if (duration === 0) return 0;
        return (time / duration) * 100;
    }, [duration]);

    // Calculate time from position
    const percentToTime = useCallback((percent: number): number => {
        return (percent / 100) * duration;
    }, [duration]);

    // Handle drag interactions with smooth updates
    const handlePointerDown = useCallback((e: React.PointerEvent, handle: 'start' | 'end') => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(handle);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onInteractionStart?.();

        // Initial scrub to the handle position
        if (onScrub) {
            onScrub(handle === 'start' ? localStart : localEnd);
        }
    }, [onInteractionStart, onScrub, localStart, localEnd]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isDragging || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const time = percentToTime(percent);

        let newStart = localStart;
        let newEnd = localEnd;

        if (isDragging === 'start') {
            newStart = Math.max(0, Math.min(time, localEnd - MIN_TRIM_DURATION));
            setLocalStart(newStart);
            onScrub?.(newStart);
        } else {
            const maxEnd = Math.min(duration, localStart + maxDuration);
            newEnd = Math.max(localStart + MIN_TRIM_DURATION, Math.min(time, maxEnd));
            setLocalEnd(newEnd);
            onScrub?.(newEnd);
        }
    }, [isDragging, percentToTime, localStart, localEnd, duration, maxDuration, onScrub]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isDragging) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            // Final update with current values
            onTrimChange(localStart, localEnd);
            setIsDragging(null);
            onInteractionEnd?.();
        }
    }, [isDragging, localStart, localEnd, onTrimChange, onInteractionEnd]);

    // Prevent touch events from triggering back gesture
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.stopPropagation();
    }, []);

    // Use local values for smooth visual updates during drag
    const startPercent = timeToPercent(isDragging ? localStart : trimStart);
    const endPercent = timeToPercent(isDragging ? localEnd : trimEnd);
    const playheadPercent = timeToPercent(currentTime);

    // Check if playhead is within trim range
    const showPlayhead = currentTime >= (isDragging ? localStart : trimStart) && currentTime <= (isDragging ? localEnd : trimEnd);

    return (
        <div className="w-full px-3 py-3 bg-black/80 backdrop-blur-sm rounded-2xl flex items-center gap-3">

            {/* Filmstrip Timeline */}
            <div
                ref={trackRef}
                className="relative h-12 flex-1 rounded-lg overflow-hidden"
            >
                {/* Thumbnail Strip */}
                <div className="absolute inset-0 flex">
                    {isGeneratingThumbnails ? (
                        <div className="flex-1 flex items-center justify-center bg-gray-800">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : thumbnails.length > 0 ? (
                        thumbnails.map((thumb, i) => (
                            <div key={i} className="flex-1 h-full">
                                <img
                                    src={thumb}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="flex-1 bg-gray-800" />
                    )}
                </div>

                {/* Darkened areas outside selection */}
                <div
                    className="absolute inset-y-0 left-0 bg-black/70 pointer-events-none transition-[width] duration-[16ms]"
                    style={{ width: `${startPercent}%` }}
                />
                <div
                    className="absolute inset-y-0 right-0 bg-black/70 pointer-events-none transition-[width] duration-[16ms]"
                    style={{ width: `${100 - endPercent}%` }}
                />

                {/* Selection highlight border */}
                <div
                    className="absolute inset-y-0 border-y-[3px] border-[#EC1D99] pointer-events-none"
                    style={{
                        left: `${startPercent}%`,
                        width: `${endPercent - startPercent}%`
                    }}
                />

                {/* Playhead indicator - shows current position during playback */}
                {showPlayhead && (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] pointer-events-none z-30"
                        style={{ left: `${playheadPercent}%` }}
                    />
                )}

                {/* Start Handle - Large touch target */}
                <div
                    className="absolute top-0 bottom-0 w-14 -ml-7 cursor-ew-resize z-10 flex items-center justify-center"
                    style={{
                        left: `${startPercent}%`,
                        touchAction: 'pan-y'
                    }}
                    onTouchStart={handleTouchStart}
                    onPointerDown={(e) => handlePointerDown(e, 'start')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    {/* Visual handle */}
                    <div className={`w-4 h-full ${isDragging === 'start' ? 'bg-white' : 'bg-[#EC1D99]'} rounded-l-lg flex items-center justify-center shadow-lg`}>
                        <div className="w-1 h-6 bg-white/60 rounded-full" />
                    </div>
                </div>

                {/* End Handle - Large touch target */}
                <div
                    className="absolute top-0 bottom-0 w-14 -ml-7 cursor-ew-resize z-10 flex items-center justify-center"
                    style={{
                        left: `${endPercent}%`,
                        touchAction: 'pan-y'
                    }}
                    onTouchStart={handleTouchStart}
                    onPointerDown={(e) => handlePointerDown(e, 'end')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    {/* Visual handle */}
                    <div className={`w-4 h-full ${isDragging === 'end' ? 'bg-white' : 'bg-[#EC1D99]'} rounded-r-lg flex items-center justify-center shadow-lg`}>
                        <div className="w-1 h-6 bg-white/60 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
