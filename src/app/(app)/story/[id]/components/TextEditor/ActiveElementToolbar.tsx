import { Type, Trash, Check, Palette, AlignCenter, Layers } from "lucide-react";
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
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-[70] pointer-events-auto animate-in fade-in slide-in-from-right duration-150">
            {/* Vertical toolbar - matching drawing tools style */}
            <div className="flex flex-col items-center gap-4">
                {/* Add Text */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddText();
                    }}
                    className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg transition-all hover:bg-gray-700"
                    aria-label="Add text"
                >
                    <Type className="w-5 h-5 text-white" />
                </button>

                {/* Style (opens color/font options) */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetActiveMenu('color');
                    }}
                    className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg transition-all hover:bg-gray-700"
                    aria-label="Style"
                >
                    <Palette className="w-5 h-5 text-white" />
                </button>

                {/* Background */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetActiveMenu('bg');
                    }}
                    className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg transition-all hover:bg-gray-700"
                    aria-label="Background"
                >
                    <Layers className="w-5 h-5 text-white" />
                </button>

                {/* Align */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetActiveMenu('align');
                    }}
                    className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg transition-all hover:bg-gray-700"
                    aria-label="Align"
                >
                    <AlignCenter className="w-5 h-5 text-white" />
                </button>

                {/* Delete */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="w-10 h-10 rounded-full bg-red-500/30 backdrop-blur-sm border-2 border-red-500/50 flex items-center justify-center shadow-lg transition-all hover:bg-red-500/50"
                    aria-label="Delete"
                >
                    <Trash className="w-5 h-5 text-red-400" />
                </button>

                {/* Done */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDone();
                    }}
                    className="w-10 h-10 rounded-full bg-[#EC1D99] border-2 border-white flex items-center justify-center shadow-lg transition-all hover:bg-[#D41884]"
                    aria-label="Done"
                >
                    <Check className="w-5 h-5 text-white" />
                </button>
            </div>
        </div>
    );
}
