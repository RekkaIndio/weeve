import React from 'react';
import { Palette } from 'lucide-react';

export interface Theme {
    id: string;
    name: string;
    colors: string[]; // Array of hex codes for preview
}

const THEMES: Theme[] = [
    {
        id: 'default',
        name: 'Weeve',
        colors: ['#EC1D99', '#000000'],
    },
    {
        id: 'neon',
        name: 'Neon',
        colors: ['#00FF9D', '#1A1A1A'],
    },
    {
        id: 'ocean',
        name: 'Ocean',
        colors: ['#00B4D8', '#03045E'],
    },
    {
        id: 'sunset',
        name: 'Sunset',
        colors: ['#FF9E00', '#5A189A'],
    },
    {
        id: 'forest',
        name: 'Forest',
        colors: ['#55A630', '#2B2D42'],
    },
];

interface ThemeSelectorProps {
    selectedTheme: string;
    onSelect: (themeId: string) => void;
}

export default function ThemeSelector({ selectedTheme, onSelect }: ThemeSelectorProps) {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-300 font-sans">
                    Visual Theme
                </h3>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                {THEMES.map((theme) => {
                    const isSelected = selectedTheme === theme.id;
                    return (
                        <button
                            key={theme.id}
                            onClick={() => onSelect(theme.id)}
                            className={`relative flex flex-col items-center gap-2 min-w-[80px] p-2 rounded-xl border transition-all ${isSelected
                                    ? 'bg-gray-800 border-[#EC1D99]'
                                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                }`}
                        >
                            <div className="w-full h-12 rounded-lg overflow-hidden flex">
                                {theme.colors.map((color, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 h-full"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <span
                                className={`text-xs font-medium font-sans ${isSelected ? 'text-white' : 'text-gray-400'
                                    }`}
                            >
                                {theme.name}
                            </span>
                            {isSelected && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EC1D99]" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
