import { STICKER_EMOJIS } from "../../constants/stickers";
import type { PhotoSticker } from "../../types";

interface StickerPanelProps {
    onSelectSticker: (emoji: string) => void;
    currentStickersCount: number;
    onClearStickers: () => void;
}

export function StickerPanel({ onSelectSticker, currentStickersCount, onClearStickers }: StickerPanelProps) {
    return (
        <div className="fixed bottom-36 left-0 right-0 z-[110] pointer-events-auto animate-in slide-in-from-bottom duration-200">
            {/* Instructions - above carousel */}
            <div className="text-center pt-2 pb-1 px-4">
                <span className="text-xs text-gray-400">
                    {currentStickersCount > 0
                        ? 'Drag to move • Double-tap to remove'
                        : 'Tap emoji to add sticker'}
                </span>
            </div>
            <div
                className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide bg-gradient-to-t from-black/80 to-transparent"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {STICKER_EMOJIS.map((emoji, index) => (
                    <button
                        key={index}
                        onClick={() => onSelectSticker(emoji)}
                        className="shrink-0 w-12 h-12 flex items-center justify-center text-3xl bg-white/10 rounded-xl hover:bg-white/20 hover:scale-110 transition-all active:scale-95"
                    >
                        {emoji}
                    </button>
                ))}
                {/* Clear All button */}
                {currentStickersCount > 0 && (
                    <button
                        onClick={onClearStickers}
                        className="shrink-0 w-12 h-12 flex items-center justify-center bg-red-500/20 border border-red-500/50 rounded-xl hover:bg-red-500/40 transition-all"
                        aria-label="Clear all stickers"
                    >
                        <span className="text-red-500 text-xs font-bold">CLEAR</span>
                    </button>
                )}
            </div>
        </div>
    );
}
