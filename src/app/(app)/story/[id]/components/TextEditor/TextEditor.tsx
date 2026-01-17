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

                            {/* Text Content */}
                            <div
                                className={`
                                    relative px-5 py-4 min-w-[200px] max-w-[80vw] text-center
                                    ${isEditing ? '' : 'hover:ring-1 hover:ring-white/30'}
                                    transition-all duration-200 rounded-3xl
                                `}
                                style={{
                                    fontFamily: element.style.fontFamily,
                                    fontSize: element.style.fontSize,
                                    color: element.style.textColor,
                                    textAlign: element.style.textAlign,
                                    backgroundColor: isEditing ? element.style.backgroundColor : 'transparent',
                                    cursor: isEditing ? 'text' : 'pointer',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isEditing) {
                                        onSetActiveElementId(element.id);
                                    }
                                }}
                            >
                                {isEditing ? (
                                    <textarea
                                        autoFocus
                                        value={element.content}
                                        onChange={(e) => onUpdateContent(element.id, e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        placeholder="Type something..."
                                        className="w-full bg-transparent border-none outline-none resize-none text-inherit placeholder:text-white/40 placeholder:text-lg placeholder:font-light"
                                        style={{
                                            fontFamily: 'inherit',
                                            fontSize: element.content ? 'inherit' : '18px',
                                            color: 'inherit',
                                            textAlign: element.style.textAlign as any,
                                            minHeight: '1.5em',
                                        }}
                                        rows={3}
                                    />
                                ) : (
                                    <span style={{
                                        whiteSpace: 'pre-wrap',
                                        backgroundColor: element.style.backgroundColor !== 'transparent' ? element.style.backgroundColor : undefined,
                                        boxDecorationBreak: 'clone',
                                        WebkitBoxDecorationBreak: 'clone',
                                        padding: '0.3em 0.5em',
                                        borderRadius: '0.5em',
                                        lineHeight: '1.4',
                                        display: 'inline'
                                    }}>
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
