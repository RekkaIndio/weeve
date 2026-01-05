import { X, TrendingUp, Info, Clapperboard, Sparkles } from "lucide-react";

interface FeedInfoModalProps {
    feedType: 'seeds' | 'canon' | string;
    onClose: () => void;
}

export default function FeedInfoModal({ feedType, onClose }: FeedInfoModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={onClose}>
            <div
                className="bg-gray-900 border border-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{feedType === 'seeds' ? '🌱' : '🎬'}</span>
                        <h3 className="text-lg font-bold">
                            {feedType === 'seeds' ? 'About Seeds' : 'About Canon'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {feedType === 'seeds' ? (
                    <div className="space-y-4 text-sm text-gray-300">
                        <p>
                            <span className="text-white font-medium">Seeds</span> are brand-initiated story prompts designed for you to add your creative spin.
                        </p>
                        <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                            <p className="text-white font-medium">How to participate:</p>
                            <ul className="space-y-2 text-gray-400">
                                <li className="flex items-start gap-2">
                                    <span className="text-[#EC1D99]">1.</span>
                                    <span>Browse Seed posts from brands you love</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#EC1D99]">2.</span>
                                    <span>Add your contribution to open slots</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#EC1D99]">3.</span>
                                    <span>Get featured and earn recognition</span>
                                </li>
                            </ul>
                        </div>
                        <p className="text-gray-400">
                            Seeds encourage creative collaboration between brands and their community.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 text-sm text-gray-300">
                        <p>
                            <span className="text-white font-medium">Canon</span> posts are complete brand narratives that you can fork and remix with your own interpretation.
                        </p>
                        <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                            <p className="text-white font-medium">How to participate:</p>
                            <ul className="space-y-2 text-gray-400">
                                <li className="flex items-start gap-2">
                                    <span className="text-[#EC1D99]">1.</span>
                                    <span>Watch the original Canon story</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#EC1D99]">2.</span>
                                    <span>Tap "Fork" to create your version</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#EC1D99]">3.</span>
                                    <span>Add your creative content to open slots</span>
                                </li>
                            </ul>
                        </div>
                        <p className="text-gray-400">
                            Canon forks let you put your personal stamp on brand storytelling while preserving the original narrative.
                        </p>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-6 py-3 rounded-full bg-[#EC1D99] text-white font-medium hover:bg-[#d61a88] transition-colors"
                >
                    Got it!
                </button>
            </div>
        </div>
    );
}
