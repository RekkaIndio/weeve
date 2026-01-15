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
    onUpdateStyle: (key: keyof TextStyle, value: string | number) => void;
    onCloseMenu: () => void;
}

export function TextControls({ activeMenu, activeElement, onUpdateStyle, onCloseMenu }: TextControlsProps) {
    if (!activeMenu) return null;

    return (
        <div
            className="absolute right-2 top-1/2 -translate-y-1/2 z-[80] pointer-events-auto animate-in fade-in slide-in-from-right duration-150"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Vertical toolbar - matching main toolbar style */}
            <div className="flex flex-col items-center gap-4">
                {/* Close Button */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCloseMenu();
                    }}
                    className="w-10 h-10 rounded-full bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg transition-all hover:bg-gray-700"
                    aria-label="Close menu"
                >
                    <X className="w-5 h-5 text-white" />
                </button>

                {activeMenu === 'font' && (
                    <>
                        {FONT_OPTIONS.map((font) => (
                            <button
                                key={font.value}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('fontFamily', font.value);
                                }}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${activeElement?.style.fontFamily === font.value ? 'bg-[#EC1D99] border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 hover:bg-gray-700'}`}
                                style={{ fontFamily: font.value }}
                                onPointerDown={(e) => e.stopPropagation()}
                                title={font.label}
                            >
                                <span className="text-white text-xs font-bold">{font.label.slice(0, 2)}</span>
                            </button>
                        ))}
                    </>
                )}
                {activeMenu === 'color' && (
                    <>
                        {TEXT_COLOR_OPTIONS.map((color) => (
                            <button
                                key={color}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('textColor', color);
                                }}
                                className={`w-10 h-10 rounded-full border-2 shadow-lg transition-all ${activeElement?.style.textColor === color ? 'border-white scale-110' : 'border-white/30 hover:scale-105'}`}
                                style={{ backgroundColor: color }}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                        ))}
                    </>
                )}
                {activeMenu === 'bg' && (
                    <>
                        {BACKGROUND_OPTIONS.map((color) => (
                            <button
                                key={color}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('backgroundColor', color);
                                }}
                                className={`w-10 h-10 rounded-lg border-2 shadow-lg transition-all ${activeElement?.style.backgroundColor === color ? 'border-white scale-105' : 'border-white/30 hover:border-white/50'}`}
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
                    </>
                )}
                {activeMenu === 'align' && (
                    <>
                        {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('textAlign', value);
                                }}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${activeElement?.style.textAlign === value ? 'bg-[#EC1D99] border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 hover:bg-gray-700'}`}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Icon className="w-5 h-5 text-white" />
                            </button>
                        ))}
                    </>
                )}
                {activeMenu === 'size' && (
                    <>
                        {[
                            { label: 'S', value: 18 },
                            { label: 'M', value: 28 },
                            { label: 'L', value: 40 },
                            { label: 'XL', value: 56 },
                        ].map((size) => (
                            <button
                                key={size.value}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('fontSize', size.value);
                                }}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${activeElement?.style.fontSize === size.value ? 'bg-[#EC1D99] border-2 border-white' : 'bg-gray-800/90 backdrop-blur-sm border-2 border-white/30 hover:bg-gray-700'}`}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <span className="text-white text-xs font-bold">{size.label}</span>
                            </button>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
