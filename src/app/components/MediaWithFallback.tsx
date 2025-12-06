import React, { useState, useEffect } from 'react';
import AestheticFallback from './AestheticFallback';

interface MediaWithFallbackProps extends React.HTMLAttributes<HTMLElement> {
    src?: string;
    alt?: string;
    className?: string;
    videoClassName?: string;
}

export default function MediaWithFallback({
    src,
    alt = "",
    className = "",
    videoClassName = "",
    ...props
}: MediaWithFallbackProps) {
    const [hasError, setHasError] = useState(false);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);

    useEffect(() => {
        setHasError(false);

        if (!src) {
            setHasError(true);
            setMediaType(null);
            return;
        }

        // Determine if the src is a video or image
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
        const isVideo = videoExtensions.some(ext => src.toLowerCase().includes(ext));

        setMediaType(isVideo ? 'video' : 'image');
    }, [src]);

    const onError = () => {
        if (!hasError) {
            setHasError(true);
        }
    };

    // If there's an error or no src, render the aesthetic fallback
    if (hasError || !src) {
        return <AestheticFallback className={className} />;
    }

    // Render video
    if (mediaType === 'video') {
        return (
            <video
                src={src}
                className={`weeve-inline-video ${className} ${videoClassName}`}
                onError={onError}
                muted
                playsInline
                loop
                preload="metadata"
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                onCanPlay={(e) => {
                    const video = e.currentTarget;
                    video.style.opacity = '1';
                    video.style.visibility = 'visible';
                    video.style.transform = 'translate3d(0,0,0)';
                    video.play().catch(() => null);
                }}
                style={{
                    opacity: 0,
                    visibility: 'hidden',
                    transform: 'translate3d(-9999px,-9999px,0)',
                    transition: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    backgroundImage: 'none',
                    backgroundColor: '#000000'
                }}
                {...props}
            />
        );
    }

    // Render image
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={onError}
            {...props}
        />
    );
}
