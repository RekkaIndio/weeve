import { useRef, useState, useEffect } from "react";
import { DrawingCanvas } from "@/app/components/DrawingCanvas";
import { DraggableSticker } from "@/app/components/DraggableSticker";
import { PHOTO_FILTERS } from "../constants/filters";
import type { PhotoSticker, MediaDraft } from "../types";

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

