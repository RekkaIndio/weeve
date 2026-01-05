import { Story, Contribution } from "@/lib/store";
import { RefObject } from "react";

interface FeedItemMediaProps {
    mediaType: 'video' | 'image' | 'text' | 'drawing' | 'audio';
    mediaUrl?: string;
    currentVideoSrc?: string;
    isPlaying: boolean;
    isVideoVisible: boolean;
    isBufferVisible: boolean;
    videoRef: RefObject<HTMLVideoElement | null>;
    bufferVideoRef: RefObject<HTMLVideoElement | null>;
    effectiveIsVisible: boolean;
    handleVideoEnded: () => void;
    setHasInteracted: (interacted: boolean) => void;
    setIsPlaying: (playing: boolean) => void;
    displayOrderedContributions: Contribution[];
    story: Story;
    currentContribution?: Contribution;
    // For waiting screen
    waitingForFirstContribution: boolean;
    waitingParticipant?: any;
    currentUser: any;
}

export default function FeedItemMedia({
    mediaType,
    mediaUrl,
    currentVideoSrc,
    isPlaying,
    isVideoVisible,
    isBufferVisible,
    videoRef,
    bufferVideoRef,
    effectiveIsVisible,
    handleVideoEnded,
    setHasInteracted,
    setIsPlaying,
    displayOrderedContributions,
    story,
    currentContribution,
    waitingForFirstContribution,
    waitingParticipant,
    currentUser
}: FeedItemMediaProps) {
    return (
        <>
            {/* Media Background */}
            {waitingForFirstContribution && waitingParticipant?.id !== currentUser?.id ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white">
                    {/* Group Indicator */}
                    {story.groupAvatar && (
                        <div className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full border border-white/20 shadow-lg overflow-hidden bg-gray-800">
                            <img src={story.groupAvatar} alt="Group" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-sm">
                        <div className="relative">
                            <div className="w-[52px] h-[52px] rounded-full border-2 border-[#EC1D99]/70 p-1 animate-pulse">
                                <img
                                    src={waitingParticipant?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(waitingParticipant?.name || 'Storyteller')}`}
                                    alt={waitingParticipant?.name || 'Next creator'}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 bg-[#EC1D99] rounded-full p-0.5">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            </div>
                        </div>
                        <span className="text-sm font-semibold tracking-wide uppercase text-gray-300">Waiting for</span>
                        <span className="text-lg font-bold text-white">
                            {waitingParticipant?.name?.split(' ')[0] || 'the first stitch'}
                        </span>
                    </div>
                    {story.currentTurnUserId === currentUser?.id && (
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                            <img src="/weeve-logo.png" alt="Your Turn" className="w-6 h-6 animate-glow-pulse drop-shadow-md" />
                            <span className="text-[11px] font-bold text-white bg-[#EC1D99] px-2 py-0.5 rounded-full">Your turn</span>
                        </div>
                    )}
                </div>
            ) : mediaType === 'video' && (mediaUrl || currentVideoSrc) ? (
                <>
                    {/* Black overlay that sits above the video until playback is ready */}
                    <div
                        className="absolute inset-0 bg-black transition-opacity"
                        style={{
                            pointerEvents: 'none',
                            opacity: isPlaying ? 0 : 1,
                            transition: 'opacity 160ms linear',
                            zIndex: 9
                        }}
                    />
                    <video
                        ref={videoRef}
                        src={currentVideoSrc}
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23000000'/%3E%3C/svg%3E"
                        className="weeve-inline-video absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        playsInline
                        preload="auto"
                        loop={displayOrderedContributions.length === 1}
                        controls={false}
                        controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                        disablePictureInPicture
                        disableRemotePlayback
                        onEnded={handleVideoEnded}
                        onPlay={(e) => {
                            setIsPlaying(true);
                        }}
                        onPause={() => {
                            setIsPlaying(false);
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const video = e.currentTarget;

                            video.muted = false;
                            video.volume = 1.0;

                            setHasInteracted(true);
                        }}
                        onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            // Set volume to maximum
                            video.volume = 1.0;
                        }}
                        onLoadedData={(e) => {
                            // Manually play the video after it's loaded to avoid browser play button
                            const video = e.currentTarget;
                            if (effectiveIsVisible) {
                                video.play().catch((err) => {

                                });
                            }
                        }}
                        onVolumeChange={(e) => {

                        }}
                        style={{
                            opacity: isVideoVisible ? 1 : 0,
                            // CRITICAL: Use opacity transition for crossfade between primary and buffer
                            visibility: 'visible',
                            transform: 'translate3d(0,0,0)',
                            transition: 'opacity 160ms linear',
                            backgroundColor: '#000000',
                            // Ensure video covers entire area immediately
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            // Force hide any browser-added play buttons
                            WebkitAppearance: 'none',
                            appearance: 'none',
                            backgroundImage: 'none',
                            // Extra safeguard
                            pointerEvents: isVideoVisible ? 'auto' : 'none'
                        }}
                    />
                    <video
                        ref={bufferVideoRef}
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23000000'/%3E%3C/svg%3E"
                        className="weeve-inline-video absolute inset-0 w-full h-full object-cover pointer-events-none"
                        playsInline
                        preload="auto"
                        controls={false}
                        autoPlay
                        style={{
                            opacity: isBufferVisible ? 1 : 0,
                            visibility: 'visible',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#000000'
                        }}
                    />
                </>
            ) : mediaType === 'drawing' && mediaUrl ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <img
                        key={mediaUrl}
                        src={mediaUrl}
                        alt={story.title}
                        className="w-full h-auto max-h-full object-contain"
                    />
                </div>
            ) : mediaType === 'image' && mediaUrl ? (
                <img
                    key={mediaUrl}
                    src={mediaUrl}
                    alt={story.title}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white p-6 text-center">
                    <p className="text-2xl font-semibold leading-snug max-w-xl line-clamp-6">
                        {currentContribution?.content || story.description || story.title}
                    </p>
                </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />
        </>
    );
}
