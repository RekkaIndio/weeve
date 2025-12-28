import { useRef } from "react";
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

    if (stitchMode === 'drawing') {
        return (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto px-8 pt-12 pb-32">
                <DrawingCanvas
                    ref={drawingCanvasRef}
                    className="max-h-[70vh] w-auto"
                    onAddText={onAddText}
                    onToggleStickers={onToggleStickers}
                    isStickerPanelOpen={showStickerPanel}
                    onClearStickers={onClearStickers}
                    hasStickers={photoStickers.length > 0}
                    hideUI={!!activeElementId}
                />
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
