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
    onUpdateContent: (id: string, content: string) => void;
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
    onUpdateContent,
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
                            left: showCentered ? '50%' : (element.position.unit === '%' ? `${element.position.left}%` : 0),
                            top: showCentered ? '20%' : (element.position.unit === '%' ? `${element.position.top}%` : 0),
                            transform: showCentered
                                ? 'translate3d(-50%, 0, 0)'
                                : element.position.unit === '%'
                                    ? 'translate3d(0, 0, 0)'
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
                            {/* Drag Handle (Visible in Edit Mode) */}
                            {isEditing && (
                                <div
                                    className="mb-2 px-3 py-1 bg-white/20 rounded-full backdrop-blur-md cursor-grab active:cursor-grabbing hover:bg-white/30 transition-colors pointer-events-auto"
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        onDragStart(e, element.id);
                                    }}
                                >
                                    <div className="w-8 h-1 bg-white/50 rounded-full" />
                                </div>
                            )}

                            {/* Auto-sizing Container */}
                            <div className="relative min-w-[200px] max-w-[80vw]">
                                {/* Invisible Span for Auto-sizing (Always rendered to dictate size) */}
                                <span
                                    style={{
                                        fontFamily: element.style.fontFamily,
                                        fontSize: element.style.fontSize,
                                        textAlign: element.style.textAlign,
                                        lineHeight: '1.4',
                                        padding: '0.3em 0.5em',
                                        whiteSpace: 'pre-wrap',
                                        display: 'block', // Ensure it behaves like a block for width/height
                                        opacity: 0, // Invisible
                                        pointerEvents: 'none',
                                        minHeight: '1.5em', // Minimum height for empty state
                                    }}
                                    aria-hidden="true"
                                >
                                    {element.content || 'Type something...'}
                                    {/* Add zero-width space to ensure height with trailing newlines if needed, though pre-wrap usually handles it */}
                                    &#8203;
                                </span>

                                {/* Visible Content */}
                                {isEditing ? (
                                    <textarea
                                        autoFocus
                                        value={element.content}
                                        onChange={(e) => onUpdateContent(element.id, e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        placeholder="Type something..."
                                        className="absolute inset-0 w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-white/40 placeholder:font-light"
                                        style={{
                                            fontFamily: element.style.fontFamily,
                                            fontSize: element.style.fontSize,
                                            color: element.style.textColor,
                                            textAlign: element.style.textAlign,
                                            backgroundColor: element.style.backgroundColor,
                                            borderRadius: '0.5em',
                                            padding: '0.3em 0.5em', // Match span padding
                                            lineHeight: '1.4',      // Match span line-height
                                        }}
                                        spellCheck={false}
                                    />
                                ) : (
                                    <span
                                        className={`${isEditing ? '' : 'hover:ring-1 hover:ring-white/30'} transition-all duration-200 rounded-lg absolute inset-0`}
                                        style={{
                                            fontFamily: element.style.fontFamily,
                                            fontSize: element.style.fontSize,
                                            color: element.style.textColor,
                                            textAlign: element.style.textAlign,
                                            backgroundColor: element.style.backgroundColor !== 'transparent' ? element.style.backgroundColor : undefined,
                                            whiteSpace: 'pre-wrap',
                                            boxDecorationBreak: 'clone',
                                            WebkitBoxDecorationBreak: 'clone',
                                            padding: '0.3em 0.5em',
                                            lineHeight: '1.4',
                                            cursor: 'pointer',
                                            display: 'block' // Match sizing logic
                                        }}
                                    >
                                        {element.content || ''}
                                    </span>
                                )}
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
                onCloseMenu={() => onSetActiveMenu(null)}
            />
        </>
    );
}
