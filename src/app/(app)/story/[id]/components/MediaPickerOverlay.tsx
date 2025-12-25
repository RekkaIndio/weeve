import { X } from "lucide-react";
import type { MediaPickerConfig } from "../types";

interface MediaPickerOverlayProps {
    config: MediaPickerConfig;
    onSelectSource: (type: 'image' | 'video', source: 'camera' | 'gallery') => void;
    onCancel: () => void;
}

export function MediaPickerOverlay({ config, onSelectSource, onCancel }: MediaPickerOverlayProps) {
    const { type, heading, TakeIcon, takeLabel, UploadIcon, uploadLabel } = config;

    return (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-end pb-12 animate-in slide-in-from-bottom duration-300">
            <button
                onClick={onCancel}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
            >
                <X className="w-8 h-8" />
            </button>

            <h2 className="text-xl font-bold mb-8">{heading}</h2>

            <div className="flex gap-6 mb-8">
                <button
                    onClick={() => onSelectSource(type, 'camera')}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                        <TakeIcon className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-medium">{takeLabel}</span>
                </button>

                <button
                    onClick={() => onSelectSource(type, 'gallery')}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                        <UploadIcon className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-medium">{uploadLabel}</span>
                </button>
            </div>
        </div>
    );
}
