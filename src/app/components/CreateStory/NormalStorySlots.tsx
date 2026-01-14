import React from "react";
import { Reorder } from "framer-motion";
import StorySlotItem from "./StorySlotItem";
import { StorySlot, Friend } from "./types";

interface NormalStorySlotsProps {
    slots: StorySlot[];
    inviteCount: number;
    onSlotCountChange: (increment: boolean) => void;
    onReorderSlots: (newSlots: StorySlot[]) => void;
    onRemoveFriend: (friendId: string, slotIndex?: number) => void;
    onFillSlot: (index: number) => void;
    isReordering: boolean;
    setIsReordering: (isReordering: boolean) => void;
    currentUser?: {
        id: string;
    };
    isLockedSlot1?: boolean;
}

const NormalStorySlots = ({
    slots,
    inviteCount,
    onSlotCountChange,
    onReorderSlots,
    onRemoveFriend,
    onFillSlot,
    isReordering,
    setIsReordering,
    currentUser,
    isLockedSlot1 = false
}: NormalStorySlotsProps) => {
    return (
        <>
            <div className="bg-gray-800/30 p-4 rounded-2xl border border-white/5">
                <label
                    htmlFor="invite-count"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 font-sans pl-1"
                >
                    Number of Participants
                </label>
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={() => {
                            const current = inviteCount + 1;
                            if (current > 2) {
                                onSlotCountChange(false);
                            }
                        }}
                        disabled={inviteCount + 1 <= 2}
                        className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                    >
                        <span className="text-xl font-bold mb-1">-</span>
                    </button>

                    <div className="flex-1 text-center">
                        <div className="text-3xl font-bold text-white tracking-tight">
                            {inviteCount + 1}
                        </div>
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
                            People Total
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            const current = inviteCount + 1;
                            if (current < 11) {
                                onSlotCountChange(true);
                            }
                        }}
                        disabled={inviteCount + 1 >= 11}
                        className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                    >
                        <span className="text-xl font-bold mb-1">+</span>
                    </button>
                </div>
            </div>

            {/* Improved Slots Visualization */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-300">Story Turn Order</span>

                    {/* Reorder Toggle */}
                    <button
                        onClick={() => setIsReordering(!isReordering)}
                        className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${isReordering
                            ? "bg-[#EC1D99] text-white"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                            }`}
                    >
                        {isReordering ? "Done" : "Reorder"}
                    </button>
                </div>

                {/* Reorder.Group for Drag and Drop */}
                <Reorder.Group
                    axis="x"
                    layoutScroll
                    values={slots}
                    onReorder={onReorderSlots}
                    className={`flex items-start py-2 pb-4 no-scrollbar px-5 ${isReordering ? "overflow-x-hidden" : "overflow-x-auto"
                        }`}
                    style={{
                        transform: "translateZ(0)",
                        willChange: isReordering ? "transform" : "auto"
                    }}
                >
                    {slots.map((slot, idx) => {
                        const participant = slot.friend;
                        const isCurrentUser = participant?.id === currentUser?.id;

                        return (
                            <StorySlotItem
                                key={slot.id}
                                slot={slot}
                                index={idx}
                                isCurrentUser={isCurrentUser}
                                isLocked={idx === 0 && isLockedSlot1}
                                onRemove={onRemoveFriend}
                                onFill={(i) => onFillSlot(i)}
                                isLast={idx === slots.length - 1}
                                isReordering={isReordering}
                            />
                        );
                    })}
                </Reorder.Group>
            </div>
        </>
    );
};

export default NormalStorySlots;
