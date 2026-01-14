import { type TextElement, type TextStyle } from "@/lib/store";
import { DrawingCanvasRef } from "@/app/components/DrawingCanvas";
import type { PhotoSticker, MediaDraft } from "../types";
import { EditorCanvas } from "./EditorCanvas";
import { TextEditor } from "./TextEditor/TextEditor";
import { PhotoFilters } from "./PhotoEditor/PhotoFilters";
import { StickerPanel } from "./PhotoEditor/StickerPanel";

interface StitchComposerProps {
    isComposerOpen: boolean;
    stitchMode: 'video' | 'image' | 'drawing' | 'text' | 'audio' | null;
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
    drawingCanvasRef: React.RefObject<DrawingCanvasRef | null>;
    draggableRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
    justSelectedRef: React.MutableRefObject<boolean>;
    stageRef: React.RefObject<HTMLDivElement | null>;

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
    onUpdateTextStyle: (key: keyof TextStyle, value: string | number) => void;
    onUpdateTextContent: (id: string, content: string) => void;
    onDeleteTextElement: (id: string) => void;
    // Video trimmer handler
    onToggleTrimmer?: () => void;
    onTrimChange?: (start: number, end: number) => void;

    showVideoTrimmer?: boolean;
    // Mute props
    isMuted?: boolean;
    onToggleMute?: () => void;
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
    stageRef,
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
    onDeleteTextElement,
    onToggleTrimmer,
    onTrimChange,

    showVideoTrimmer,
    isMuted,
    onToggleMute
}: StitchComposerProps) {
    if (!isComposerOpen) return null;

    return (
        <div
            ref={stageRef}
            className="absolute inset-0 z-40 pointer-events-auto overflow-hidden"
            onClick={() => {
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
                onToggleTrimmer={onToggleTrimmer}
                onTrimChange={onTrimChange}

                showVideoTrimmer={showVideoTrimmer}
                isMuted={isMuted}
                onToggleMute={onToggleMute}
            />

            {/* TextEditor available for all content modes */}
            {(stitchMode === 'text' || stitchMode === 'drawing' || stitchMode === 'image' || stitchMode === 'video') && (
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

            {/* StickerPanel available for image, video, and drawing modes */}
            {(stitchMode === 'image' || stitchMode === 'video' || stitchMode === 'drawing') && showStickerPanel && (
                <StickerPanel
                    onSelectSticker={onSelectSticker}
                    currentStickersCount={photoStickers.length}
                    onClearStickers={onClearStickers}
                />
            )}
        </div>
    );
}
