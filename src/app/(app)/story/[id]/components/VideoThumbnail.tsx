'use client';

import { useState, useEffect, useRef } from 'react';

interface VideoThumbnailProps {
    src: string;
    className?: string;
    alt?: string;
}

/**
 * VideoThumbnail extracts the first frame of a video and displays it as an image.
 * This prevents the browser from showing the default play button on video elements.
 */
export function VideoThumbnail({ src, className = '', alt = 'Video thumbnail' }: VideoThumbnailProps) {
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (!src) {
            setError(true);
            return;
        }

        // Create a hidden video element to extract the first frame
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';

        const handleLoadedData = () => {
            try {
                // Create canvas and draw the video frame
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 200;
                canvas.height = video.videoHeight || 200;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setThumbnail(dataUrl);
                }
            } catch (err) {
                console.warn('Failed to extract video thumbnail:', err);
                setError(true);
            }

            // Cleanup
            video.remove();
        };

        const handleError = () => {
            console.warn('Failed to load video for thumbnail:', src);
            setError(true);
            video.remove();
        };

        // Seek to the first frame
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('error', handleError);

        // Set source and load
        video.src = src;
        video.currentTime = 0.1; // Seek slightly into video to get a frame

        videoRef.current = video;

        return () => {
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('error', handleError);
            video.remove();
        };
    }, [src]);

    // Show a gray placeholder while loading or on error
    if (error || !thumbnail) {
        return (
            <div className={`bg-gray-800 flex items-center justify-center ${className}`}>
                <div className="w-4 h-4 rounded-full bg-gray-600 animate-pulse" />
            </div>
        );
    }

    return (
        <img
            src={thumbnail}
            alt={alt}
            className={className}
        />
    );
}

export default VideoThumbnail;
