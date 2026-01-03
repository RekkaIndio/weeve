import { X, Video, Camera, Pencil, Mic } from "lucide-react";

interface StitchMenuProps {
    onOptionSelect: (option: 'video' | 'image' | 'drawing' | 'audio') => void;
    onClose: () => void;
}

export function StitchMenu({ onOptionSelect, onClose }: StitchMenuProps) {
    return (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-40 flex flex-col items-center justify-end pb-12 animate-in slide-in-from-bottom duration-300">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
            >
                <X className="w-8 h-8" />
            </button>

            <h2 className="text-xl font-bold mb-8">How do you want to Weeve?</h2>

            <div className="flex gap-6 mb-8">
                <button
                    onClick={() => onOptionSelect('video')}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                        <Video className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-medium">Video</span>
                </button>

                <button
                    onClick={() => onOptionSelect('image')}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                        <Camera className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-medium">Photo</span>
                </button>

                <button
                    onClick={() => onOptionSelect('drawing')}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                        <Pencil className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-medium">Draw</span>
                </button>

                {/* Audio option hidden for now - uncomment when ready
                <button
                    onClick={() => onOptionSelect('audio')}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#EC1D99] transition-colors">
                        <Mic className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-medium">Audio</span>
                </button>
                */}
            </div>
        </div>
    );
}
