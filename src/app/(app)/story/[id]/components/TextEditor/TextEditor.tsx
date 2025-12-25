import { useRef } from "react";
import { type TextElement, type TextStyle } from "@/lib/store";
import { TextControls } from "./TextControls";
import { ActiveElementToolbar } from "./ActiveElementToolbar";

interface TextEditorProps {
    textElements: TextElement[];
    activeElementId: string | null;
    activeMenu: string | null;
    hasMovedInCurrentEdit: boolean;
    draggableRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
    onDragStart: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
    onDragMove: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
    onDragEnd: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
    onSetActiveElementId: (id: string | null) => void;
    onSetActiveMenu: (menu: string | null) => void;
    onSetHasMovedInCurrentEdit: (moved: boolean) => void;
    onUpdateStyle: (key: keyof TextStyle, value: any) => void;
    onDeleteElement: (id: string) => void;
    onAddText: () => void;
}

export function TextEditor({
    textElements,
    activeElementId,
    activeMenu,
    hasMovedInCurrentEdit,
    draggableRefs,
    onDragStart,
    onDragMove,
    onDragEnd,
    onSetActiveElementId,
    onSetActiveMenu,
    onSetHasMovedInCurrentEdit,
    onUpdateStyle,
    onDeleteElement,
    onAddText
}: TextEditorProps) {

    // Find active element
    const activeElement = activeElementId ? textElements.find(el => el.id === activeElementId) || null : null;

    return (
        <>
            {textElements.map((element) => {
                const isEditing = activeElementId === element.id;
                const isInitialCenter = element.position.left === -1 && element.position.top === -1;

                // Focus Mode: If editing and haven't manually moved it, force it to center (above keyboard)
                const showCentered = (isEditing && !hasMovedInCurrentEdit) || isInitialCenter;

                return (
                    <div
                        key={element.id}
                        ref={(el) => {
                            if (el) draggableRefs.current.set(element.id, el);
                            else draggableRefs.current.delete(element.id);
                        }}
                        className={`pointer-events-auto select-none absolute touch-none ${isEditing ? 'z-[60]' : 'z-30 hover:z-40'}`}
                        style={{
                            left: showCentered ? '50%' : 0,
                            top: showCentered ? '20%' : 0, // 30% down is a good "above keyboard" spot usually
                            transform: showCentered
                                ? 'translate3d(-50%, 0, 0)'
                                : `translate3d(${element.position.left}px, ${element.position.top}px, 0)`,
                        }}
                        onPointerDown={(e) => {
                            if (!isEditing) onDragStart(e, element.id);
                        }}
                        onPointerMove={(e) => {
                            onDragMove(e, element.id);
                        }}
                        onPointerUp={(e) => {
                            onDragEnd(e, element.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative group flex flex-col items-center">
                            {/* Drag Handle (Visible in Edit Mode + View Mode?) */}
                            {/* User asked for handle on top. Useful for Edit Mode. */}
                            {isEditing && (
                                <div
                                    className="mb-2 px-3 py-1 bg-white/20 rounded-full backdrop-blur-md cursor-grab active:cursor-grabbing hover:bg-white/30 transition-colors pointer-events-auto"
                                    onPointerDown={(e) => {
                                        // Specific handle for dragging when in edit mode
                                        e.stopPropagation(); // prevent exiting edit mode
                                        onDragStart(e, element.id);
                                    }}
                                >
                                    <div className="w-8 h-1 bg-white/50 rounded-full" />
                                </div>
                            )}

                            {/* Text Content */}
                            <div
                                className={`
                                    relative px-5 py-4 min-w-[50px] text-center
                                    ${isEditing ? 'ring-2 ring-[#EC1D99] shadow-[0_0_0_4px_rgba(236,29,153,0.3)]' : 'hover:ring-1 hover:ring-white/30'}
                                    transition-all duration-200 rounded-3xl
                                `}
                                style={{
                                    fontFamily: element.style.fontFamily,
                                    fontSize: element.style.fontSize,
                                    color: element.style.textColor,
                                    textAlign: element.style.textAlign,
                                    backgroundColor: element.style.backgroundColor === 'transparent'
                                        ? (isEditing ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)') // increased visibility while editing
                                        : element.style.backgroundColor,
                                    whiteSpace: 'pre-wrap', // Preserve line breaks
                                    backdropFilter: 'blur(4px)',
                                    cursor: isEditing ? 'text' : 'pointer',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isEditing) {
                                        onSetActiveElementId(element.id);
                                        // justSelectedRef.current = true; // Handled in parent usually, or we assume parent won't clear immediately
                                        // setTimeout(() => justSelectedRef.current = false, 100);
                                    }
                                }}
                            >
                                {element.content || (isEditing ? "Type something..." : "")}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Active Element Toolbar (Edit Controls near the element) */}
            <ActiveElementToolbar
                activeElement={activeElement}
                activeMenu={activeMenu}
                onSetActiveMenu={onSetActiveMenu}
                onDelete={() => activeElementId && onDeleteElement(activeElementId)}
                onDone={() => {
                    onSetActiveElementId(null);
                    onSetActiveMenu(null);
                    onSetHasMovedInCurrentEdit(false);
                }}
                onAddText={onAddText}
            />

            {/* Bottom Options Bar (Font, Color, etc.) */}
            <TextControls
                activeMenu={activeMenu}
                activeElement={activeElement}
                onUpdateStyle={onUpdateStyle}
            />
        </>
    );
}
