import { useRef } from "react";
import { type TextElement, type TextStyle } from "@/lib/store";
import type { PhotoSticker, MediaDraft } from "../types";
import { EditorCanvas } from "./EditorCanvas";
import { TextEditor } from "./TextEditor/TextEditor";
import { PhotoFilters } from "./PhotoEditor/PhotoFilters";
import { StickerPanel } from "./PhotoEditor/StickerPanel";

interface StitchComposerProps {
    isComposerOpen: boolean;
    stitchMode: 'video' | 'image' | 'drawing' | 'text' | null;
    mediaDraft: MediaDraft | null;

    // State
    photoFilter: string;
    photoStickers: PhotoSticker[];
    textElements: TextElement[];
    activeElementId: string | null;
    activeMenu: string | null;
    hasMovedInCurrentEdit: boolean;
    showPhotoFilterPanel: boolean;
    showStickerPanel: boolean;
    draggingStickerId: string | null;

    // Refs
    drawingCanvasRef: React.RefObject<any>;
    draggableRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
    justSelectedRef: React.MutableRefObject<boolean>;

    // Handlers
    onBackgroundClick: () => void;
    onAddText: () => void;
    onToggleStickers: () => void;
    onClearStickers: () => void;
    onSetPhotoStickers: (stickers: PhotoSticker[]) => void;
    onSetDraggingStickerId: (id: string | null) => void;
    onSelectFilter: (id: string) => void;
    onSelectSticker: (emoji: string) => void;

    // TextEditor Handlers
    onDragStart: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
    onDragMove: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
    onDragEnd: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
    onSetActiveElementId: (id: string | null) => void;
    onSetActiveMenu: (menu: string | null) => void;
    onSetHasMovedInCurrentEdit: (moved: boolean) => void;
    onUpdateTextStyle: (key: keyof TextStyle, value: any) => void;
    onUpdateTextContent: (id: string, content: string) => void;
    onDeleteTextElement: (id: string) => void;
}

export function StitchComposer({
    isComposerOpen,
    stitchMode,
    mediaDraft,
    photoFilter,
    photoStickers,
    textElements,
    activeElementId,
    activeMenu,
    hasMovedInCurrentEdit,
    showPhotoFilterPanel,
    showStickerPanel,
    draggingStickerId,
    drawingCanvasRef,
    draggableRefs,
    justSelectedRef,
    onBackgroundClick,
    onAddText,
    onToggleStickers,
    onClearStickers,
    onSetPhotoStickers,
    onSetDraggingStickerId,
    onSelectFilter,
    onSelectSticker,
    onDragStart,
    onDragMove,
    onDragEnd,
    onSetActiveElementId,
    onSetActiveMenu,
    onSetHasMovedInCurrentEdit,
    onUpdateTextStyle,
    onUpdateTextContent,
    onDeleteTextElement
}: StitchComposerProps) {
    if (!isComposerOpen) return null;

    return (
        <div
            className="absolute inset-0 z-40 pointer-events-auto overflow-hidden"
            onClick={(e) => {
                // Skip if we just selected an element via tap (prevents flashing deselection)
                if (justSelectedRef.current) return;
                onBackgroundClick();
            }}
        >
            <EditorCanvas
                stitchMode={stitchMode}
                mediaDraft={mediaDraft}
                photoFilter={photoFilter}
                photoStickers={photoStickers}
                drawingCanvasRef={drawingCanvasRef}
                showStickerPanel={showStickerPanel}
                activeElementId={activeElementId}
                draggingStickerId={draggingStickerId}
                onAddText={onAddText}
                onToggleStickers={onToggleStickers}
                onClearStickers={onClearStickers}
                onSetPhotoStickers={onSetPhotoStickers}
                onSetDraggingStickerId={onSetDraggingStickerId}
            />

            {(stitchMode === 'text' || stitchMode === 'drawing') && (
                <TextEditor
                    textElements={textElements}
                    activeElementId={activeElementId}
                    activeMenu={activeMenu}
                    hasMovedInCurrentEdit={hasMovedInCurrentEdit}
                    draggableRefs={draggableRefs}
                    onDragStart={onDragStart}
                    onDragMove={onDragMove}
                    onDragEnd={onDragEnd}
                    onSetActiveElementId={onSetActiveElementId}
                    onSetActiveMenu={onSetActiveMenu}
                    onSetHasMovedInCurrentEdit={onSetHasMovedInCurrentEdit}
                    onUpdateStyle={onUpdateTextStyle}
                    onUpdateContent={onUpdateTextContent}
                    onDeleteElement={onDeleteTextElement}
                    onAddText={onAddText}
                />
            )}

            {/* Controls */}
            {stitchMode === 'image' && showPhotoFilterPanel && mediaDraft?.previewUrl && (
                <PhotoFilters
                    currentFilter={photoFilter}
                    onSelectFilter={onSelectFilter}
                    previewImage={mediaDraft.previewUrl}
                />
            )}

            {(stitchMode === 'image' || stitchMode === 'drawing') && showStickerPanel && (
                <StickerPanel
                    onSelectSticker={onSelectSticker}
                    currentStickersCount={photoStickers.length}
                    onClearStickers={onClearStickers}
                />
            )}
        </div>
    );
}
