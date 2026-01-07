import { useState, useEffect, useRef } from "react";
import { DrawingCanvas, DrawingCanvasRef } from "@/app/components/DrawingCanvas";
import { DraggableSticker } from "@/app/components/DraggableSticker";
import { PHOTO_FILTERS } from "../constants/filters";
import type { PhotoSticker, MediaDraft } from "../types";
import { Type, Smile, Trash, Scissors, Volume2, VolumeX } from "lucide-react";
import { VideoTrimmer } from "./VideoEditor/VideoTrimmer";

interface EditorCanvasProps {
    stitchMode: 'video' | 'image' | 'drawing' | 'text' | 'audio' | null;
    mediaDraft: MediaDraft | null;
    photoFilter: string;
    photoStickers: PhotoSticker[];
    drawingCanvasRef: React.RefObject<DrawingCanvasRef | null>;
    showStickerPanel: boolean;
    activeElementId: string | null;
    draggingStickerId: string | null;
    onAddText: () => void;
    onToggleStickers: () => void;
    onClearStickers: () => void;
    onSetPhotoStickers: (stickers: PhotoSticker[]) => void;
    onSetDraggingStickerId: (id: string | null) => void;
    // Video trimmer props
    onToggleTrimmer?: () => void;
    showVideoTrimmer?: boolean;
    onTrimChange?: (start: number, end: number) => void;
    // Mute props
    isMuted?: boolean;
    onToggleMute?: () => void;
}

export function EditorCanvas({
    stitchMode,
    mediaDraft,
    photoFilter,
    photoStickers,
    drawingCanvasRef,
    showStickerPanel,
    activeElementId,
    draggingStickerId,
    onAddText,
    onToggleStickers,
    onClearStickers,
    onSetPhotoStickers,
    onSetDraggingStickerId,
    onToggleTrimmer,
    showVideoTrimmer = false,
    onTrimChange,
    isMuted = false,
    onToggleMute
}: EditorCanvasProps) {
    // Capture the initial viewport height to prevent canvas resize when keyboard opens
    // Capture the initial viewport height to prevent canvas resize when keyboard opens
    const [fixedHeight, setFixedHeight] = useState<number | null>(null);

    useEffect(() => {
        // Lock the height on mount to prevent keyboard resize
        if (typeof window !== 'undefined' && fixedHeight === null) {
            setFixedHeight(window.innerHeight);
        }
    }, []);

    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);

    // Effect to ensure video respects trim bounds when they change
    useEffect(() => {
        if (videoRef.current && mediaDraft?.trimStart !== undefined) {
            if (videoRef.current.currentTime < mediaDraft.trimStart) {
                videoRef.current.currentTime = mediaDraft.trimStart;
            }
        }
    }, [mediaDraft?.trimStart]);

    if (stitchMode === 'video' && mediaDraft?.previewUrl) {
        return (
            <div className="absolute inset-0 pointer-events-none">
                <video
                    ref={videoRef}
                    src={mediaDraft.previewUrl}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-auto"
                    autoPlay
                    playsInline
                    muted={isMuted} // Use isMuted prop
                    loop={false} // Handle looping manually
                    onTimeUpdate={(e) => {
                        const time = e.currentTarget.currentTime;
                        setCurrentTime(time);
                        const start = mediaDraft.trimStart || 0;
                        const end = mediaDraft.trimEnd || e.currentTarget.duration;

                        if (end > 0 && time >= end) {
                            e.currentTarget.currentTime = start;
                            e.currentTarget.play();
                        }
                    }}
                    onLoadedMetadata={(e) => {
                        const start = mediaDraft.trimStart || 0;
                        if (e.currentTarget.currentTime < start) {
                            e.currentTarget.currentTime = start;
                        }
                    }}
                    onClick={(e) => {
                        if (e.currentTarget.paused) e.currentTarget.play();
                        else e.currentTarget.pause();
                    }}
                />
                {/* Video Trimmer Overlay */}
                {showVideoTrimmer && (
                    <div className="absolute bottom-28 left-4 right-4 z-[80] pointer-events-auto">
                        <VideoTrimmer
                            videoUrl={mediaDraft.previewUrl}
                            trimStart={mediaDraft.trimStart || 0}
                            trimEnd={mediaDraft.trimEnd || 0}
                            onTrimChange={onTrimChange || (() => { })}
                            currentTime={currentTime}
                            onScrub={(time) => {
                                if (videoRef.current) {
                                    videoRef.current.currentTime = time;
                                    // Avoid triggering re-renders during high-frequency scrub events
                                    // setCurrentTime(time); 
                                }
                            }}
                            onInteractionStart={() => videoRef.current?.pause()}
                            onInteractionEnd={() => videoRef.current?.play()}
                        />
                    </div>
                )}

                {/* Stickers Overlay */}
                {photoStickers.map((sticker) => (
                    <DraggableSticker
                        key={sticker.id}
                        id={sticker.id}
                        emoji={sticker.emoji}
                        initialX={sticker.x}
                        initialY={sticker.y}
                        initialScale={sticker.scale}
                        isDragging={draggingStickerId === sticker.id}
                        onDragStart={onSetDraggingStickerId}
                        onDragEnd={() => onSetDraggingStickerId(null)}
                        onUpdate={(id, updates) => {
                            onSetPhotoStickers(photoStickers.map(s =>
                                s.id === id ? { ...s, ...updates } : s
                            ));
                        }}
                        onDelete={(id) => {
                            onSetPhotoStickers(photoStickers.filter(s => s.id !== id));
                        }}
                    />
                ))}
                {/* Right Side Tool Menu - matching drawing tools style */}
                {!activeElementId && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-[70] pointer-events-auto">
                        {/* Trim Button */}
                        {onToggleTrimmer && (
                            <button
                                onClick={onToggleTrimmer}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${showVideoTrimmer ? 'bg-[#EC1D99] border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30'}`}
                                aria-label="Trim Video"
                            >
                                <Scissors className="w-5 h-5 text-white" />
                            </button>
                        )}

                        {/* Mute Button - only if handler provided */}
                        {onToggleMute && (
                            <button
                                onClick={onToggleMute}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${isMuted ? 'bg-red-500 border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30'}`}
                                aria-label={isMuted ? "Unmute Video" : "Mute Video"}
                            >
                                {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                            </button>
                        )}

                        {/* Add Text Button */}
                        <button
                            onClick={onAddText}
                            className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg transition-all hover:bg-gray-700"
                            aria-label="Add Text"
                        >
                            <Type className="w-5 h-5 text-white" />
                        </button>

                        {/* Sticker Button */}
                        <button
                            onClick={onToggleStickers}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${showStickerPanel ? 'bg-[#EC1D99] border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30'}`}
                            aria-label="Stickers"
                        >
                            <Smile className="w-5 h-5 text-white" />
                        </button>

                        {/* Clear Stickers - if stickers exist */}
                        {photoStickers.length > 0 && onClearStickers && (
                            <button
                                onClick={onClearStickers}
                                className="w-10 h-10 rounded-full bg-red-500/30 backdrop-blur-sm border-2 border-red-500/50 flex items-center justify-center shadow-lg transition-all hover:bg-red-500/50"
                                aria-label="Clear stickers"
                            >
                                <Trash className="w-5 h-5 text-red-400" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (stitchMode === 'image' && mediaDraft?.previewUrl) {
        return (
            <div className="absolute inset-0 pointer-events-none">
                <img
                    src={mediaDraft.previewUrl}
                    alt="Selected media preview"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-auto transition-all duration-300"
                    style={{ filter: PHOTO_FILTERS.find(f => f.id === photoFilter)?.filter || 'none' }}
                />
                {/* Stickers Overlay */}
                {photoStickers.map((sticker) => (
                    <DraggableSticker
                        key={sticker.id}
                        id={sticker.id}
                        emoji={sticker.emoji}
                        initialX={sticker.x}
                        initialY={sticker.y}
                        initialScale={sticker.scale}
                        isDragging={draggingStickerId === sticker.id}
                        onDragStart={onSetDraggingStickerId}
                        onDragEnd={() => onSetDraggingStickerId(null)}
                        onUpdate={(id, updates) => {
                            onSetPhotoStickers(photoStickers.map(s =>
                                s.id === id ? { ...s, ...updates } : s
                            ));
                        }}
                        onDelete={(id) => {
                            onSetPhotoStickers(photoStickers.filter(s => s.id !== id));
                        }}
                    />
                ))}
            </div>
        );
    }

    if (stitchMode === 'drawing' || stitchMode === 'text') {
        return (
            <div
                className="absolute inset-0 pointer-events-auto"
                style={{ height: fixedHeight ? `${fixedHeight}px` : '100%' }}
            >
                {/* Full-screen container */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <DrawingCanvas
                        ref={drawingCanvasRef}
                        className="h-full w-auto max-w-full"
                        onAddText={onAddText}
                        onToggleStickers={onToggleStickers}
                        isStickerPanelOpen={showStickerPanel}
                        onClearStickers={onClearStickers}
                        hasStickers={photoStickers.length > 0}
                        hideUI={stitchMode === 'text' || !!activeElementId}
                    />
                </div>
                {/* Stickers Overlay for Drawing */}
                {photoStickers.map((sticker) => (
                    <DraggableSticker
                        key={sticker.id}
                        id={sticker.id}
                        emoji={sticker.emoji}
                        initialX={sticker.x}
                        initialY={sticker.y}
                        initialScale={sticker.scale}
                        isDragging={draggingStickerId === sticker.id}
                        onDragStart={onSetDraggingStickerId}
                        onDragEnd={() => onSetDraggingStickerId(null)}
                        onUpdate={(id, updates) => {
                            onSetPhotoStickers(photoStickers.map(s =>
                                s.id === id ? { ...s, ...updates } : s
                            ));
                        }}
                        onDelete={(id) => {
                            onSetPhotoStickers(photoStickers.filter(s => s.id !== id));
                        }}
                    />
                ))}
            </div>
        );
    }

    return null;
}

