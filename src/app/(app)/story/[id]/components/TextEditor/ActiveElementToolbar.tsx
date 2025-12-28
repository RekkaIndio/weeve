import { Type, Trash, Check, Palette, AlignCenter } from "lucide-react";
import { type TextElement } from "@/lib/store";

interface ActiveElementToolbarProps {
    activeElement: TextElement | null;
    activeMenu: string | null;
    onSetActiveMenu: (menu: string | null) => void;
    onDelete: () => void;
    onDone: () => void;
    onAddText: () => void;
}

export function ActiveElementToolbar({
    activeElement,
    activeMenu,
    onSetActiveMenu,
    onDelete,
    onDone,
    onAddText
}: ActiveElementToolbarProps) {
    if (!activeElement) return null;

    // If a submenu is active (font, color, bg, align, size), hide the toolbar to reduce clutter
    if (activeMenu) return null;

    return (
        <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-3 z-[70] pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Simple compact toolbar */}
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl">
                {/* Add Text */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddText();
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                    aria-label="Add text"
                >
                    <Type className="w-5 h-5" />
                </button>

                {/* Style (opens color/font options) */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetActiveMenu('color');
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                    aria-label="Style"
                >
                    <Palette className="w-5 h-5" />
                </button>

                {/* Align */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetActiveMenu('align');
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                    aria-label="Align"
                >
                    <AlignCenter className="w-5 h-5" />
                </button>

                <div className="w-px h-5 bg-white/20" />

                {/* Delete */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-2 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
                    aria-label="Delete"
                >
                    <Trash className="w-5 h-5" />
                </button>

                {/* Done */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDone();
                    }}
                    className="p-2 rounded-full bg-[#EC1D99] hover:bg-[#D41884] text-white transition-colors"
                    aria-label="Done"
                >
                    <Check className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
