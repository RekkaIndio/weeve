"use client";

import { useRef, useState, useEffect } from "react";

interface AutoAdvanceProps {
    onComplete: () => void;
    isPlaying: boolean;
    duration: number;
}

export function AutoAdvance({ onComplete, isPlaying, duration }: AutoAdvanceProps) {
    useEffect(() => {
        if (!isPlaying) return;
        const timer = setTimeout(onComplete, duration);
        return () => clearTimeout(timer);
    }, [isPlaying, onComplete, duration]);
    return null;
}

interface VideoPlayerProps {
    src?: string;
    onComplete: () => void;
    isPlaying: boolean;
}

export function VideoPlayer({ src, onComplete, isPlaying }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay', 'deny');
        video.preload = 'auto';

        // Set ready state on load
        const handleReady = () => setIsReady(true);
        video.addEventListener('loadeddata', handleReady);
        video.addEventListener('canplay', handleReady);

        return () => {
            video.removeEventListener('loadeddata', handleReady);
            video.removeEventListener('canplay', handleReady);
        };
    }, [src]);

    // Play or pause based on isPlaying
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying && isReady) {
            const playVideo = async () => {
                try {
                    video.currentTime = 0;
                    await video.play();
                } catch (err) {
                    console.error("Play failed:", err);
                    video.muted = true;
                    try {
                        await video.play();
                    } catch (mutedErr) {
                        console.error("Muted play failed:", mutedErr);
                        setError(true);
                    }
                }
            };
            playVideo();
        } else if (!isPlaying) {
            video.pause();
        }
    }, [src, isPlaying, isReady]);

    // Notify when video ends or safety timer fires
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onLoadedMetadata = () => {
            const duration = video.duration;
            if (isFinite(duration)) {
                const safetyTimer = setTimeout(() => {
                    onComplete();
                }, (duration * 1000) + 2000);
                return () => clearTimeout(safetyTimer);
            }
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
    }, [src, onComplete]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <button onClick={onComplete} className="text-white">
                    Video Error. Skip →
                </button>
            </div>
        );
    }

    return (
        <video
            ref={videoRef}
            src={src}
            className="weeve-inline-video w-full h-full object-cover"
            playsInline
            preload="auto"
            controls={false}
            controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
            disablePictureInPicture
            disableRemotePlayback
            onEnded={onComplete}
            onCanPlay={(e) => {
                const video = e.currentTarget;
                setIsReady(true);
                if (isPlaying) {
                    video.play().catch(() => null);
                }
            }}
            onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                video.volume = 1.0;
                video.muted = false;
            }}
            onClick={(e) => {
                const video = e.currentTarget;
                video.muted = false;
                video.volume = 1.0;
            }}
            style={{
                opacity: isReady ? 1 : 0,
                visibility: isReady ? 'visible' : 'hidden',
                transform: isReady ? 'translate3d(0,0,0)' : 'translate3d(-9999px,-9999px,0)',
                transition: 'none',
                backgroundColor: '#000000',
                WebkitAppearance: 'none',
                appearance: 'none',
                backgroundImage: 'none'
            }}
        />
    );
}
