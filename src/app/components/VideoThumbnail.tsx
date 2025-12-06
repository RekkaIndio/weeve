"use client";

import { useEffect, useRef, useState } from "react";

interface VideoThumbnailProps {
    src: string;
    poster?: string;
    className?: string;
}

export default function VideoThumbnail({ src, poster, className = "" }: VideoThumbnailProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

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

    if (hasError || !src) {
        return <div className={`bg-gray-900 ${className}`} />;
    }

    return (
        <video
            ref={videoRef}
            src={src}
            className={`weeve-inline-video object-cover ${className}`}
            loop
            muted
            playsInline
            preload="metadata"
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            poster={poster && !poster.includes('placehold.co') ? poster : undefined}
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
    );
}

