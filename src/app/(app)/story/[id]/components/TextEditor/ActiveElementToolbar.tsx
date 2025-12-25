import { Type, Edit2, AlignLeft, Trash, X } from "lucide-react";
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

    // Determine default icon for alignment button based on current state would be nice, 
    // but the original code just uses AlignLeft in the toolbar button (line 2577)

    return (
        <div className="absolute top-[45%] left-0 right-0 flex flex-col items-center justify-center z-[70] pointer-events-auto">
            <div className="flex items-center gap-3 mb-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl animate-in zoom-in duration-200">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddText();
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                    aria-label="Add more text"
                >
                    <Type className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetActiveMenu(activeMenu === 'font' ? null : 'font');
                    }}
                    className={`p-2 rounded-full transition-colors ${activeMenu === 'font' ? 'bg-white text-black' : 'hover:bg-white/10 text-white'}`}
                >
                    <span className="font-serif font-bold text-lg leading-none">Ag</span>
                </button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetActiveMenu(activeMenu === 'color' ? null : 'color');
                    }}
                    className={`p-2 rounded-full transition-colors ${activeMenu === 'color' ? 'bg-white text-black' : 'hover:bg-white/10 text-white'}`}
                >
                    <div
                        className="w-5 h-5 rounded-full border-2 border-current"
                        style={{ backgroundColor: activeElement.style.textColor }}
                    />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetActiveMenu(activeMenu === 'bg' ? null : 'bg');
                    }}
                    className={`p-2 rounded-full transition-colors ${activeMenu === 'bg' ? 'bg-white text-black' : 'hover:bg-white/10 text-white'}`}
                >
                    <div className="w-5 h-5 rounded border border-current flex items-center justify-center">
                        <span className="text-[10px] font-bold">BG</span>
                    </div>
                </button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetActiveMenu(activeMenu === 'align' ? null : 'align');
                    }}
                    className={`p-2 rounded-full transition-colors ${activeMenu === 'align' ? 'bg-white text-black' : 'hover:bg-white/10 text-white'}`}
                >
                    <AlignLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetActiveMenu(activeMenu === 'size' ? null : 'size');
                    }}
                    className={`p-2 rounded-full transition-colors ${activeMenu === 'size' ? 'bg-white text-black' : 'hover:bg-white/10 text-white'}`}
                >
                    <Edit2 className="w-5 h-5" />
                </button>
            </div>

            {/* Actions: Delete and Done */}
            {/* Delete Button */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                }}
                className="flex flex-col items-center gap-1 drop-shadow-md text-red-400 hover:text-red-300"
            >
                <Trash className="w-6 h-6" />
                <span className="text-[10px] font-bold shadow-black text-shadow">Delete</span>
            </button>

            {/* Done Button */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDone();
                }}
                className="mt-4 w-8 h-8 flex items-center justify-center bg-white rounded-full text-black shadow-lg hover:bg-gray-200"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}
