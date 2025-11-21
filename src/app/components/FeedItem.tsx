"use client";

import { Story } from "@/lib/store";
import { MessageCircle, Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

interface FeedItemProps {
    story: Story;
}

export default function FeedItem({ story }: FeedItemProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get current contribution or fallback
    const contributions = story.contributions || [];
    const currentContribution = contributions[currentIndex];

    // If no contributions, use story cover
    const mediaUrl = currentContribution?.mediaUrl || story.coverImage;
    const mediaType = currentContribution?.mediaType || 'image';
    const activeUserId = currentContribution?.userId;

    // Intersection Observer to track visibility
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0.6 } // 60% visibility required to play
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                observer.unobserve(containerRef.current);
            }
        };
    }, []);

    // Handle auto-advancement and playback
    useEffect(() => {
        if (contributions.length === 0 || !isVisible) {
            // Pause video if not visible
            if (videoRef.current) {
                videoRef.current.pause();
            }
            return;
        }

        let timeoutId: NodeJS.Timeout;

        const handleNext = () => {
            setCurrentIndex((prev) => (prev + 1) % contributions.length);
        };

        if (mediaType === 'image') {
            // Auto-advance images after 4 seconds
            timeoutId = setTimeout(handleNext, 4000);
        }

        // For video, we rely on onEnded event, but we need to make sure it plays
        if (mediaType === 'video' && videoRef.current) {
            videoRef.current.play().catch(e => console.log("Autoplay prevented:", e));
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [currentIndex, contributions.length, mediaType, isVisible]);

    const handleVideoEnded = () => {
        setCurrentIndex((prev) => (prev + 1) % contributions.length);
    };

    return (
        <div ref={containerRef} className="relative w-full h-[calc(100vh-80px)] snap-start shrink-0 bg-gray-900 overflow-hidden">
            {/* Media Background */}
            {mediaType === 'video' && mediaUrl ? (
                <video
                    ref={videoRef}
                    key={mediaUrl} // Force re-render on url change to ensure autoplay works
                    src={mediaUrl}
                    className="absolute inset-0 w-full h-full object-cover opacity-100" // Removed opacity-80 for better visibility
                    autoPlay
                    muted={false} // Enable sound
                    playsInline
                    onEnded={handleVideoEnded}
                />
            ) : (
                <img
                    key={mediaUrl}
                    src={mediaUrl || "https://via.placeholder.com/400x800"}
                    alt={story.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-100" // Removed opacity-80
                />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />

            {/* Right Sidebar Actions */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 text-white z-10">
                <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <Heart className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold">1.2k</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold">{story.contributions.length}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <Share2 className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold">Share</span>
                </div>
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 text-white z-10">
                <h2 className="text-2xl font-bold mb-2 font-poppins shadow-black drop-shadow-md">
                    {story.title}
                </h2>
                <p className="text-sm text-gray-200 mb-6 line-clamp-2 max-w-[85%]">
                    {story.description}
                </p>

                <Link
                    href={`/story/${story.id}`}
                    className="flex items-center gap-2 mb-3 w-fit hover:opacity-80 transition-opacity"
                >
                    <div className="flex -space-x-2">
                        {story.participants.slice(0, 3).map((p) => {
                            const isActive = p.id === activeUserId;
                            return (
                                <div key={p.id} className={`relative rounded-full ${isActive ? 'z-10 scale-110 transition-transform duration-300' : ''}`}>
                                    <img
                                        src={p.avatar}
                                        alt={p.name}
                                        className={`w-10 h-10 rounded-full border-2 ${isActive ? 'border-[#EC1D99] shadow-[0_0_10px_#EC1D99]' : 'border-black'}`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <span className="text-sm font-medium text-gray-300 ml-2">
                        {story.participants.length} Weevers
                    </span>
                </Link>
            </div>
        </div>
    );
}
