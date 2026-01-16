import { Story, Contribution, TextStyle } from "@/lib/store";
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
    isMuted: boolean;
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
    currentUser,
    isMuted
}: FeedItemMediaProps) {
    // Helper for legacy text styles
    const hasCustomTextStyle = currentContribution?.textStyle && Object.keys(currentContribution.textStyle).length > 0;
    const legacyTextStyle = (currentContribution?.textStyle || {}) as TextStyle;

    return (
        <>
            {/* Media Background */}
            {waitingForFirstContribution && waitingParticipant?.id !== currentUser?.id ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-black text-white">
                    {/* (omitted unchanged parts) */}
                    {/* ... */}
                </div>
            ) : mediaType === 'video' && (mediaUrl || currentVideoSrc) ? (
                <>
                    {/* Black overlay that sits above the video until playback is ready */}
                    <div
                        className="absolute inset-0 bg-black transition-opacity"
                        style={{
                            pointerEvents: 'none',
                            opacity: isVideoVisible ? 0 : 1, // Show video as soon as it's ready (readyState >= 2)
                            transition: 'opacity 100ms ease-out', // Fast transition
                            zIndex: 10
                        }}
                    >
                        {story.coverImage && (
                            <img
                                src={story.coverImage}
                                alt={story.title}
                                className="w-full h-full object-cover opacity-50 blur-xl"
                                loading="eager"
                                decoding="sync"
                            />
                        )}
                        {story.coverImage && (
                            <img
                                src={story.coverImage}
                                alt={story.title}
                                className="absolute inset-0 w-full h-full object-contain"
                                loading="eager"
                                decoding="sync"
                            />
                        )}
                    </div>
                    <video
                        ref={videoRef}
                        src={currentVideoSrc}
                        poster={story.coverImage || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23000000'/%3E%3C/svg%3E"}
                        className="weeve-inline-video absolute inset-0 w-full h-full object-contain"
                        autoPlay
                        playsInline
                        muted={isMuted}
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
                        poster={story.coverImage || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23000000'/%3E%3C/svg%3E"}
                        className="weeve-inline-video absolute inset-0 w-full h-full object-contain pointer-events-none"
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
                    className="absolute inset-0 w-full h-full object-contain"
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

            {/* Text Overlays (Stickers & Captions) - Ported from ActiveStoryView */}
            {currentContribution && currentContribution.textStyle?.elements && currentContribution.textStyle.elements.length > 0 ? (
                <>
                    {currentContribution.textStyle.elements.map((element) => (
                        <div key={element.id} className="absolute pointer-events-none" style={{
                            left: 0,
                            top: 0,
                            transform: element.position.unit === '%'
                                ? `translate3d(${element.position.left}vw, ${element.position.top}vh, 0)`
                                : `translate3d(${element.position.left}px, ${element.position.top}px, 0)`,
                            zIndex: 20
                        }}>
                            <div className="min-w-[200px] max-w-[80vw] text-center" style={{ ...element.style, backgroundColor: 'transparent', padding: 0 }}>
                                <span style={{
                                    backgroundColor: element.style.backgroundColor,
                                    padding: '0.4em 0.6em',
                                    borderRadius: '0.5em',
                                    backdropFilter: element.style.backgroundColor && element.style.backgroundColor !== 'transparent' ? 'blur(4px)' : 'none',
                                    whiteSpace: 'pre-wrap',
                                    boxDecorationBreak: 'clone',
                                    WebkitBoxDecorationBreak: 'clone',
                                    lineHeight: '1.5',
                                    display: 'inline'
                                }}>
                                    {element.content}
                                </span>
                            </div>
                        </div>
                    ))}

                </>
            ) : (
                <>
                    {/* Legacy Caption Overlay (if not Text media type, which handles its own center text) */}
                    {mediaType !== 'text' && currentContribution?.content && (
                        <div className="absolute bottom-32 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                            <div className="w-full" style={{ textAlign: hasCustomTextStyle ? legacyTextStyle.textAlign : 'left' as const }}>
                                <span
                                    className="text-lg font-medium leading-snug text-shadow-sm font-sans text-white"
                                    style={hasCustomTextStyle ? {
                                        ...legacyTextStyle,
                                        backgroundColor: legacyTextStyle.backgroundColor !== 'transparent' ? legacyTextStyle.backgroundColor : undefined,
                                        padding: '0.75rem 1.25rem', borderRadius: '1.5rem', display: 'inline-block', whiteSpace: 'pre-line'
                                    } : {}}
                                >
                                    {currentContribution.content}
                                </span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
}
