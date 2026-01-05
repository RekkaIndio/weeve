import React from "react";
import { Globe } from "lucide-react";
import { CreateStoryFormState, StorySlot, Friend } from "./types";
import { getPrice, formatPrice } from "@/lib/brand-pricing";
import NormalStorySlots from "./NormalStorySlots";

interface BrandContributorsProps {
    formState: CreateStoryFormState;
    setFormState: React.Dispatch<React.SetStateAction<CreateStoryFormState>>;
    slots: StorySlot[];
    currentUser?: {
        id: string;
        name: string;
        avatar?: string;
        brandSubscriptionStatus?: 'none' | 'active' | 'expired';
    };
    onPostTypeChange: (postType: 'normal' | 'canon' | 'seed') => void;
    onToggleCanonSlot: (slotIndex: number) => void;
    onSlotCountChange: (increment: boolean) => void;
    onReorderSlots: (newSlots: StorySlot[]) => void;
    onRemoveFriend: (friendId: string, slotIndex?: number) => void;
    onFillSlot: (index: number) => void;
    isReordering: boolean;
    setIsReordering: (isReordering: boolean) => void;
}

const BrandContributors = ({
    formState,
    setFormState,
    slots,
    currentUser,
    onPostTypeChange,
    onToggleCanonSlot,
    onSlotCountChange,
    onReorderSlots,
    onRemoveFriend,
    onFillSlot,
    isReordering,
    setIsReordering,
}: BrandContributorsProps) => {

    return (
        <>
            <fieldset aria-labelledby="story-visibility-legend">
                <legend
                    id="story-visibility-legend"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1"
                >
                    Post Type
                </legend>

                {/* Brand Post Type Selector (Canon/Seed) */}
                <div className="space-y-2">
                    <div className="flex gap-2">
                        {/* Option 1: Normal (Public) */}
                        <div
                            onClick={() => onPostTypeChange("normal")}
                            className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all border ${formState.postType === "normal" ? "bg-[#EC1D99]/10 border-[#EC1D99]" : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600"}`}
                        >
                            <div className={`p-1.5 rounded-lg ${formState.postType === "normal" ? "bg-[#EC1D99] text-white" : "bg-gray-700 text-gray-400"}`}>
                                <Globe className="w-4 h-4" />
                            </div>
                            <div>
                                <label className={`text-xs font-bold cursor-pointer block ${formState.postType === "normal" ? "text-white" : "text-gray-300"}`}>
                                    Normal
                                </label>
                                <p className="text-[10px] text-gray-500">Standard post</p>
                            </div>
                        </div>

                        {/* Option 2: Seed Mode */}
                        <div
                            onClick={() => {
                                if (currentUser?.brandSubscriptionStatus === 'active') {
                                    onPostTypeChange("seed");
                                } else {
                                    window.location.href = '/settings/subscription';
                                }
                            }}
                            className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl transition-all border relative
                    ${currentUser?.brandSubscriptionStatus !== 'active' ? 'cursor-pointer' : 'cursor-pointer'}
                    ${formState.postType === "seed" ? "bg-green-500/10 border-green-500" : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600"}`}
                        >
                            {currentUser?.brandSubscriptionStatus !== 'active' && (
                                <div className="absolute -top-1 -right-1 text-[8px] bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                                    PRO
                                </div>
                            )}
                            <div className={`p-1.5 rounded-lg ${formState.postType === "seed" ? "bg-green-500 text-white" : "bg-gray-700 text-gray-400"}`}>
                                <span className="text-sm">🌱</span>
                            </div>
                            <div>
                                <label className={`text-xs font-bold cursor-pointer block ${formState.postType === "seed" ? "text-white" : "text-gray-300"}`}>
                                    Seed
                                </label>
                                <p className="text-[10px] text-gray-500">Slot 1 locked</p>
                            </div>
                        </div>

                        {/* Option 3: Canon Mode */}
                        <div
                            onClick={() => {
                                if (currentUser?.brandSubscriptionStatus === 'active') {
                                    onPostTypeChange("canon");
                                } else {
                                    window.location.href = '/settings/subscription';
                                }
                            }}
                            className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl transition-all border relative
                    ${currentUser?.brandSubscriptionStatus !== 'active' ? 'cursor-pointer' : 'cursor-pointer'}
                    ${formState.postType === "canon" ? "bg-purple-500/10 border-purple-500" : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600"}`}
                        >
                            {currentUser?.brandSubscriptionStatus !== 'active' && (
                                <div className="absolute -top-1 -right-1 text-[8px] bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                                    PRO
                                </div>
                            )}
                            <div className={`p-1.5 rounded-lg ${formState.postType === "canon" ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-400"}`}>
                                <span className="text-sm">🎬</span>
                            </div>
                            <div>
                                <label className={`text-xs font-bold cursor-pointer block ${formState.postType === "canon" ? "text-white" : "text-gray-300"}`}>
                                    Canon
                                </label>
                                <p className="text-[10px] text-gray-500">Lock any slot</p>
                            </div>
                        </div>
                    </div>

                    {currentUser?.brandSubscriptionStatus !== 'active' && (
                        <a
                            href="/settings/subscription"
                            className="block text-center text-xs text-yellow-400 hover:text-yellow-300 transition-colors py-1"
                        >
                            ✨ Upgrade to unlock Seed & Canon posts
                        </a>
                    )}

                    {/* Visibility Duration & Pricing for Seed/Canon posts */}
                    {(formState.postType === 'seed' || formState.postType === 'canon') && (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 pl-1">
                                Post Visibility Duration
                            </label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[
                                    { days: 1, label: '1 Day' },
                                    { days: 3, label: '3 Days' },
                                    { days: 7, label: '1 Week' },
                                    { days: 14, label: '2 Weeks' },
                                ].map(({ days, label }) => {
                                    const price = getPrice(formState.postType as 'seed' | 'canon', days);
                                    const isSelected = formState.visibilityDays === days;

                                    return (
                                        <button
                                            key={days}
                                            type="button"
                                            onClick={() => setFormState(prev => ({ ...prev, visibilityDays: days }))}
                                            className={`p-2 rounded-lg text-center transition-all border ${isSelected
                                                ? 'bg-[#EC1D99]/20 border-[#EC1D99] text-white'
                                                : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="text-xs font-bold">{label}</div>
                                            <div className={`text-[9px] font-semibold ${isSelected ? 'text-green-400' : 'text-gray-500'}`}>
                                                {price ? formatPrice(price) : 'N/A'}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[9px] text-gray-500 px-1">
                                How long this post stays visible on the discovery page.
                            </p>
                        </div>
                    )}

                    {/* Product Link for Brand Posts */}
                    {(formState.postType === 'seed' || formState.postType === 'canon') && (
                        <div className="space-y-2">
                            <label htmlFor="product-url" className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 pl-1">
                                Product Link <span className="text-gray-500 font-normal normal-case ml-1">(Optional)</span>
                            </label>
                            <input
                                id="product-url"
                                type="url"
                                value={formState.productUrl || ''}
                                onChange={(e) => setFormState(prev => ({ ...prev, productUrl: e.target.value }))}
                                placeholder="https://yourbrand.com/product"
                                className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-2 focus:ring-[#EC1D99]/20 transition-all text-white text-sm placeholder-gray-500"
                            />
                            <p className="text-[9px] text-gray-500 px-1">
                                Your story title will become a clickable link to this URL
                            </p>
                        </div>
                    )}

                    {/* Info about brand posts */}
                    {formState.postType !== 'normal' && (
                        <div className="p-2 bg-gray-800/50 rounded-lg border border-gray-700/50 text-[10px] text-gray-400">
                            <span className="text-[#EC1D99] font-semibold">Note:</span> Brand posts are public. Anyone can stitch to empty slots.
                        </div>
                    )}
                </div>
            </fieldset>

            {/* Number of Participants */}
            {
                (formState.postType === 'seed' || formState.postType === 'canon') ? (
                    /* Brand Post Slot Configuration */
                    <div className="bg-gray-800/30 p-4 rounded-2xl border border-white/5 space-y-4">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 font-sans pl-1">
                            {formState.postType === 'seed' ? 'Contributor Slots' : 'Story Slots'}
                        </label>

                        {/* Slot Count Selector */}
                        <div className="flex items-center justify-between gap-4">
                            <button
                                onClick={() => {
                                    const minSlots = formState.postType === 'seed' ? 2 : 1;
                                    if (formState.inviteCount + 1 > minSlots) {
                                        onSlotCountChange(false);
                                    }
                                }}
                                disabled={formState.inviteCount + 1 <= (formState.postType === 'seed' ? 2 : 1)}
                                className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                            >
                                <span className="text-xl font-bold mb-1">-</span>
                            </button>

                            <div className="flex-1 text-center">
                                <div className="text-3xl font-bold text-white tracking-tight">
                                    {formState.inviteCount + 1}
                                </div>
                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
                                    Total Slots
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (formState.inviteCount + 1 < 10) {
                                        onSlotCountChange(true);
                                    }
                                }}
                                disabled={formState.inviteCount + 1 >= 10}
                                className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                            >
                                <span className="text-xl font-bold mb-1">+</span>
                            </button>
                        </div>

                        {/* Slot Preview */}
                        <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800">
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {Array.from({ length: formState.inviteCount + 1 }).map((_, idx) => {
                                    const isBrandSlot = formState.postType === 'seed' && idx === 0;
                                    const isCanonLocked = formState.postType === 'canon' && formState.canonSlots?.includes(idx);

                                    return (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div
                                                onClick={() => {
                                                    if (formState.postType === 'canon') {
                                                        onToggleCanonSlot(idx);
                                                    }
                                                }}
                                                className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${isBrandSlot
                                                    ? 'bg-[#EC1D99] border-2 border-[#EC1D99]'
                                                    : isCanonLocked
                                                        ? 'bg-purple-500/20 border-2 border-purple-500 cursor-pointer'
                                                        : formState.postType === 'canon'
                                                            ? 'bg-gray-700 border-2 border-gray-600 cursor-pointer hover:border-purple-400'
                                                            : 'bg-gray-700 border-2 border-gray-600'
                                                    }`}
                                            >
                                                {isBrandSlot ? (
                                                    <img
                                                        src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`}
                                                        alt="Brand"
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                ) : isCanonLocked ? (
                                                    <span className="text-lg">🔒</span>
                                                ) : (
                                                    <span className="text-gray-500 text-xs">{idx + 1}</span>
                                                )}
                                                {isBrandSlot && (
                                                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                                                        <span className="text-[8px]">🌱</span>
                                                    </div>
                                                )}
                                            </div>
                                            {idx < formState.inviteCount && (
                                                <div className="w-4 h-0.5 bg-gray-700 flex-shrink-0" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {formState.postType === 'seed' && (
                                <p className="text-[10px] text-gray-500 mt-2 text-center">
                                    🌱 You're locked in slot 1. Others will fill remaining slots.
                                </p>
                            )}
                            {formState.postType === 'canon' && (
                                <p className="text-[10px] text-gray-500 mt-2 text-center">
                                    🔒 Tap slots to lock them. Locked slots can only be filled by you.
                                </p>
                            )}
                        </div>

                        <p className="text-xs text-gray-400 px-1">
                            🌍 This post will be <span className="text-green-400 font-medium">public</span>. Anyone can stitch to open slots.
                        </p>
                    </div>
                ) : (
                    /* Normal Brand Post - Uses Common Slots UI but assumes Public */
                    <NormalStorySlots
                        slots={slots}
                        inviteCount={formState.inviteCount}
                        onSlotCountChange={onSlotCountChange}
                        onReorderSlots={onReorderSlots}
                        onRemoveFriend={onRemoveFriend}
                        onFillSlot={onFillSlot}
                        isReordering={isReordering}
                        setIsReordering={setIsReordering}
                        currentUser={currentUser}
                    />
                )
            }
        </>
    );
};

export default BrandContributors;
