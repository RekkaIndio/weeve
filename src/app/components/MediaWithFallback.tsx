import React, { useState, useEffect } from 'react';
import useOnScreen from '@/hooks/useOnScreen';
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
    const [containerRef, isVisible] = useOnScreen<HTMLDivElement>({ threshold: 0.25, rootMargin: '200px' });
    const [shouldLoad, setShouldLoad] = useState(false);

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

    useEffect(() => {
        if (isVisible) setShouldLoad(true);
    }, [isVisible]);

    // If there's an error or no src, render the aesthetic fallback
    if (hasError || !src) {
        return <AestheticFallback className={className} />;
    }

    // Render video
    if (mediaType === 'video') {
        return (
            <div ref={containerRef as any} className={className}>
                {(!shouldLoad) ? (
                    <div className="w-full h-full bg-gray-900" />
                ) : (
                    <video
                        src={shouldLoad ? src : undefined}
                        className={`weeve-inline-video ${className} ${videoClassName}`}
                onError={onError}
                muted
                playsInline
                loop
                        preload={shouldLoad ? 'auto' : 'metadata'}
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
                )}
            </div>
        );
    }

    // Render image
    return (
        <div ref={containerRef as any} className={className}>
            <img
                src={shouldLoad ? src : undefined}
                alt={alt}
                className={className}
                onError={onError}
                loading="lazy"
                {...props}
            />
        </div>
    );
}
