import {
    FONT_OPTIONS,
    TEXT_COLOR_OPTIONS,
    BACKGROUND_OPTIONS,
    ALIGN_OPTIONS,
} from "../../constants/text";
import { type TextStyle, type TextElement } from "@/lib/store";

interface TextControlsProps {
    activeMenu: string | null;
    activeElement: TextElement | null;
    onUpdateStyle: (key: keyof TextStyle, value: any) => void;
}

export function TextControls({ activeMenu, activeElement, onUpdateStyle }: TextControlsProps) {
    if (!activeMenu) return null;

    return (
        <div
            className="absolute bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md z-[70] pointer-events-auto animate-in slide-in-from-bottom border-t border-white/10"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-center overflow-x-auto no-scrollbar py-2">
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
                                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${activeElement?.style.fontFamily === font.value ? 'bg-white text-black font-bold' : 'bg-white/10 text-white hover:bg-white/20'}`}
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
                                className={`w-8 h-8 rounded-full border-2 transition-all ${activeElement?.style.textColor === color ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent hover:scale-105'}`}
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
                                className={`w-10 h-8 rounded border-2 transition-all ${activeElement?.style.backgroundColor === color ? 'border-white scale-105 shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent hover:border-white/30'}`}
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
                    <div className="flex items-center gap-4 bg-white/10 rounded-full px-2 py-1">
                        {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('textAlign', value);
                                }}
                                className={`p-2 rounded-full transition-all ${activeElement?.style.textAlign === value ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Icon className="w-5 h-5" />
                            </button>
                        ))}
                    </div>
                )}
                {activeMenu === 'size' && (
                    <div className="flex items-center gap-2 px-4 w-full max-w-sm">
                        <span className="text-xs font-bold text-gray-400">A</span>
                        <input
                            type="range"
                            min={16}
                            max={60}
                            step={2}
                            value={activeElement?.style.fontSize || 28}
                            onChange={(e) => onUpdateStyle('fontSize', parseInt(e.target.value))}
                            className="flex-1 h-2 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#EC1D99] [&::-webkit-slider-thumb]:cursor-pointer"
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                        <span className="text-xl font-bold text-white">A</span>
                    </div>
                )}
            </div>
        </div>
    );
}
