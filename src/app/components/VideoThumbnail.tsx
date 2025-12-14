"use client";

import { useEffect, useRef, useState } from "react";
import useOnScreen from '@/hooks/useOnScreen';

interface VideoThumbnailProps {
    src: string;
    poster?: string;
    className?: string;
}

export default function VideoThumbnail({ src, poster, className = "" }: VideoThumbnailProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [generatedPoster, setGeneratedPoster] = useState<string | undefined>(poster);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay', 'deny');
        video.muted = true;
        
        // Load video metadata
        video.load();
    }, [src]);

    // Determine if we should load the video based on visibility
    const [containerRef, isVisible] = useOnScreen<HTMLDivElement>({ threshold: 0.25, rootMargin: '200px' });
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        if (isVisible) setShouldLoad(true);
    }, [isVisible]);

    // Try to generate a poster frame by preloading the video offscreen only when we plan to load
    useEffect(() => {
        if (!src || poster || !shouldLoad) return; // If poster provided or not yet visible, don't try to generate
        let cancelled = false;
        let buf: HTMLVideoElement | null = null;

        const captureFrame = (videoEl: HTMLVideoElement) => {
            try {
                const width = videoEl.videoWidth;
                const height = videoEl.videoHeight;
                if (!width || !height) return null;
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return null;
                ctx.drawImage(videoEl, 0, 0, width, height);
                return canvas.toDataURL('image/jpeg', 0.8);
            } catch (err) {
                console.debug('[VideoThumbnail] captureFrame failed', err);
                return null;
            }
        };

        try {
            buf = document.createElement('video');
            buf.crossOrigin = 'anonymous';
            buf.preload = 'auto';
            buf.muted = true;
            buf.playsInline = true;
            buf.src = src;

            const handleCanPlay = () => {
                if (cancelled) return;
                const snapshot = captureFrame(buf!);
                if (snapshot) {
                    setGeneratedPoster(snapshot);
                }
            };

            buf.addEventListener('canplay', handleCanPlay, { once: true });
            buf.addEventListener('canplaythrough', handleCanPlay, { once: true });
            buf.load();
        } catch (err) {
            console.debug('[VideoThumbnail] poster generation failed', err);
        }

        return () => {
            cancelled = true;
            if (buf) {
                try {
                    buf.pause();
                    buf.src = '';
                } catch (e) { }
            }
        };
    }, [src, poster]);

    if (hasError || !src) {
        return <div className={`bg-gray-900 ${className}`} />;
    }
    const posterToUse = poster && !poster.includes('placehold.co') ? poster : generatedPoster;

    return (
        <div ref={containerRef as any} className={`relative ${className}`}> 
            {/* Poster fallback */}
            {posterToUse && (
                <img src={posterToUse} alt="thumbnail" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <video
                ref={videoRef}
                src={shouldLoad ? src : undefined}
            className={`weeve-inline-video object-cover ${className}`}
            loop
            muted
            playsInline
                preload={shouldLoad ? 'auto' : 'none'}
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            poster={posterToUse}
            onError={() => setHasError(true)}
            onCanPlay={(e) => {
                const video = e.currentTarget;
                setIsLoaded(true);
                video.play().catch(() => null);
            }}
            style={{
                opacity: isLoaded ? 0.6 : 0,
                visibility: isLoaded ? 'visible' : 'hidden',
                transform: isLoaded ? 'translate3d(0,0,0)' : 'translate3d(-9999px,-9999px,0)',
                transition: 'none',
                backgroundColor: '#000000',
                WebkitAppearance: 'none',
                appearance: 'none',
                backgroundImage: 'none'
            }}
        />
        </div>
    );
}

