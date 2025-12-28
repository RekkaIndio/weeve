import {
    FONT_OPTIONS,
    TEXT_COLOR_OPTIONS,
    BACKGROUND_OPTIONS,
    ALIGN_OPTIONS,
} from "../../constants/text";
import { type TextStyle, type TextElement } from "@/lib/store";
import { X } from "lucide-react";

interface TextControlsProps {
    activeMenu: string | null;
    activeElement: TextElement | null;
    onUpdateStyle: (key: keyof TextStyle, value: any) => void;
    onCloseMenu: () => void;
}

export function TextControls({ activeMenu, activeElement, onUpdateStyle, onCloseMenu }: TextControlsProps) {
    if (!activeMenu) return null;

    return (
        <div
            className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md z-[80] pointer-events-auto animate-in slide-in-from-bottom duration-150"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header with close button */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                    {activeMenu === 'color' && 'Text Color'}
                    {activeMenu === 'bg' && 'Background'}
                    {activeMenu === 'font' && 'Font'}
                    {activeMenu === 'align' && 'Alignment'}
                    {activeMenu === 'size' && 'Size'}
                </span>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCloseMenu();
                    }}
                    className="p-1 rounded-full hover:bg-white/10 text-white/60 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Options */}
            <div className="flex items-center justify-center overflow-x-auto no-scrollbar py-3 pb-6">
                {activeMenu === 'font' && (
                    <div className="flex items-center gap-2 px-4">
                        {FONT_OPTIONS.map((font) => (
                            <button
                                key={font.value}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('fontFamily', font.value);
                                }}
                                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${activeElement?.style.fontFamily === font.value ? 'bg-[#EC1D99] text-white font-bold' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                style={{ fontFamily: font.value }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {font.label}
                            </button>
                        ))}
                    </div>
                )}
                {activeMenu === 'color' && (
                    <div className="flex items-center gap-3 px-4">
                        {TEXT_COLOR_OPTIONS.map((color) => (
                            <button
                                key={color}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('textColor', color);
                                }}
                                className={`w-9 h-9 rounded-full border-2 transition-all ${activeElement?.style.textColor === color ? 'border-[#EC1D99] scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: color }}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                        ))}
                    </div>
                )}
                {activeMenu === 'bg' && (
                    <div className="flex items-center gap-3 px-4">
                        {BACKGROUND_OPTIONS.map((color) => (
                            <button
                                key={color}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('backgroundColor', color);
                                }}
                                className={`w-10 h-9 rounded-lg border-2 transition-all ${activeElement?.style.backgroundColor === color ? 'border-[#EC1D99] scale-105 shadow-lg' : 'border-transparent hover:border-white/30'}`}
                                style={{
                                    background: color === 'transparent'
                                        ? 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)'
                                        : color,
                                    backgroundSize: '8px 8px',
                                    backgroundColor: color === 'transparent' ? '#222' : color
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                        ))}
                    </div>
                )}
                {activeMenu === 'align' && (
                    <div className="flex items-center gap-3 px-4">
                        {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('textAlign', value);
                                }}
                                className={`p-3 rounded-xl transition-all ${activeElement?.style.textAlign === value ? 'bg-[#EC1D99] text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Icon className="w-5 h-5" />
                            </button>
                        ))}
                    </div>
                )}
                {activeMenu === 'size' && (
                    <div className="flex items-center gap-3 px-6 w-full max-w-sm">
                        <span className="text-sm font-medium text-white/60">A</span>
                        <input
                            type="range"
                            min={16}
                            max={60}
                            step={2}
                            value={activeElement?.style.fontSize || 28}
                            onChange={(e) => onUpdateStyle('fontSize', parseInt(e.target.value))}
                            className="flex-1 h-2 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#EC1D99] [&::-webkit-slider-thumb]:cursor-pointer"
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                        <span className="text-xl font-bold text-white">A</span>
                    </div>
                )}
            </div>
        </div>
    );
}
