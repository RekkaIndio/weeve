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
    onCloseMenu: () => void;
}

export function TextControls({ activeMenu, activeElement, onUpdateStyle, onCloseMenu }: TextControlsProps) {
    if (!activeMenu) return null;

    return (
        <div
            className="absolute right-14 top-1/2 -translate-y-1/2 z-[80] pointer-events-auto animate-in slide-in-from-right-2"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Panel matching drawing tools style */}
            <div className="bg-black/90 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-white/10">
                {activeMenu === 'font' && (
                    <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
                        {FONT_OPTIONS.map((font) => (
                            <button
                                key={font.value}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('fontFamily', font.value);
                                }}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors text-left ${activeElement?.style.fontFamily === font.value ? 'bg-[#EC1D99] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                style={{ fontFamily: font.value }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {font.label}
                            </button>
                        ))}
                    </div>
                )}
                {activeMenu === 'color' && (
                    <div className="grid grid-cols-2 gap-2">
                        {TEXT_COLOR_OPTIONS.map((color) => (
                            <button
                                key={color}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('textColor', color);
                                }}
                                className={`w-10 h-10 rounded-full border-2 transition-all ${activeElement?.style.textColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: color }}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                        ))}
                    </div>
                )}
                {activeMenu === 'bg' && (
                    <div className="grid grid-cols-2 gap-2">
                        {BACKGROUND_OPTIONS.map((color) => (
                            <button
                                key={color}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('backgroundColor', color);
                                }}
                                className={`w-10 h-10 rounded-lg border-2 transition-all ${activeElement?.style.backgroundColor === color ? 'border-white scale-105' : 'border-transparent hover:border-white/30'}`}
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
                    <div className="flex flex-col gap-2">
                        {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdateStyle('textAlign', value);
                                }}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center justify-center ${activeElement?.style.textAlign === value ? 'bg-[#EC1D99] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Icon className="w-5 h-5" />
                            </button>
                        ))}
                    </div>
                )}
                {activeMenu === 'size' && (
                    <div className="flex flex-col gap-2">
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
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeElement?.style.fontSize === size.value ? 'bg-[#EC1D99] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {size.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
