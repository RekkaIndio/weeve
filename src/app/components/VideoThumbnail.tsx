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

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;

        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Video autoplay prevented:", error);
            });
        }
    }, [src]);

    if (hasError || !src) {
        return <div className={`bg-gray-900 ${className}`} />;
    }

    return (
        <video
            ref={videoRef}
            src={src}
            className={`weeve-inline-video object-cover opacity-60 ${className}`}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            controls={false}
            disablePictureInPicture
            poster={poster && !poster.includes('placehold.co') ? poster : undefined}
            onError={() => setHasError(true)}
        />
    );
}

