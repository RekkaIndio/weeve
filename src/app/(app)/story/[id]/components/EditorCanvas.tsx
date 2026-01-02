import { useRef, useState, useEffect } from "react";
import { DrawingCanvas } from "@/app/components/DrawingCanvas";
import { DraggableSticker } from "@/app/components/DraggableSticker";
import { PHOTO_FILTERS } from "../constants/filters";
import type { PhotoSticker, MediaDraft } from "../types";
import { Type, Smile, Trash } from "lucide-react";

interface EditorCanvasProps {
    stitchMode: 'video' | 'image' | 'drawing' | 'text' | null;
    mediaDraft: MediaDraft | null;
    photoFilter: string;
    photoStickers: PhotoSticker[];
    drawingCanvasRef: React.RefObject<any>;
    showStickerPanel: boolean;
    activeElementId: string | null;
    draggingStickerId: string | null;
    onAddText: () => void;
    onToggleStickers: () => void;
    onClearStickers: () => void;
    onSetPhotoStickers: (stickers: PhotoSticker[]) => void;
    onSetDraggingStickerId: (id: string | null) => void;
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
    onSetDraggingStickerId
}: EditorCanvasProps) {
    // Capture the initial viewport height to prevent canvas resize when keyboard opens
    const [fixedHeight, setFixedHeight] = useState<number | null>(null);

    useEffect(() => {
        // Lock the height on mount to prevent keyboard resize
        if (typeof window !== 'undefined' && fixedHeight === null) {
            setFixedHeight(window.innerHeight);
        }
    }, [fixedHeight]);

    if (stitchMode === 'video' && mediaDraft?.previewUrl) {
        return (
            <div className="absolute inset-0 pointer-events-none">
                <video
                    src={mediaDraft.previewUrl}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-auto"
                    autoPlay
                    playsInline
                    loop
                    onClick={(e) => {
                        if (e.currentTarget.paused) e.currentTarget.play();
                        else e.currentTarget.pause();
                    }}
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
                {/* Right Side Tool Menu - matching drawing tools style */}
                {!activeElementId && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-[70] pointer-events-auto">
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
        // Calculate the canvas container height (full height minus bottom thumbnail area)
        const containerHeight = fixedHeight ? fixedHeight - 112 : undefined; // 112px = bottom-28 (7rem)

        return (
            <div
                className="absolute inset-x-0 top-0 pointer-events-auto"
                style={{ height: fixedHeight ? `${fixedHeight}px` : '100%' }}
            >
                {/* Full-screen container with space for thumbnails at bottom */}
                <div
                    className="absolute inset-x-0 top-0 flex items-center justify-center"
                    style={{ height: containerHeight ? `${containerHeight}px` : 'calc(100% - 7rem)' }}
                >
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

