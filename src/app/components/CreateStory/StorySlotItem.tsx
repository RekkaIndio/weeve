import { Reorder, useDragControls } from "framer-motion";
import { UserPlus, X } from "lucide-react";
import { StorySlot } from "./types";

interface StorySlotItemProps {
    slot: StorySlot;
    index: number;
    isCurrentUser: boolean;
    onRemove: (id: string, idx: number) => void;
    onFill: (idx: number) => void;
    isLast: boolean;
    isReordering: boolean;
    isLocked?: boolean;
}

const StorySlotItem = ({
    slot,
    index,
    isCurrentUser,
    onRemove,
    onFill,
    isLast,
    isReordering,
    isLocked = false
}: StorySlotItemProps) => {
    const controls = useDragControls();
    const participant = slot.friend;
    const isEmpty = !participant;

    return (
        <Reorder.Item
            value={slot}
            dragListener={isReordering && !isLocked} // Only drag when Reorder Mode is active and slot is not locked
            dragControls={controls}
            className="flex items-start relative group"
            style={{ touchAction: isReordering ? "none" : "pan-x" }}
        >
            <div
                className={`flex flex-col items-center transition-all duration-200 relative ${isReordering ? "animate-pulse" : ""}`}
            >
                {/* Avatar/Slot Circle */}
                <div
                    onClick={() => {
                        if (isEmpty && !isReordering && !isLocked) onFill(index);
                    }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all select-none relative bg-gray-800 ${isLocked
                        ? "ring-2 ring-gray-600 cursor-not-allowed opacity-75"
                        : isReordering && participant
                            ? "ring-2 ring-yellow-400 cursor-grab active:cursor-grabbing transform scale-105"
                            : participant
                                ? "ring-2 ring-[#EC1D99] ring-offset-2 ring-offset-black"
                                : "cursor-pointer hover:scale-105"
                        }`}
                >
                    {participant ? (
                        <img
                            src={participant.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(participant.name)}`}
                            alt={participant.name}
                            className="w-full h-full object-cover rounded-full pointer-events-none select-none"
                            draggable={false}
                        />
                    ) : (
                        <div className="w-full h-full rounded-full border-2 border-dashed border-gray-600 group-hover:border-[#EC1D99]/50 transition-colors flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-gray-600 group-hover:text-[#EC1D99]/70 transition-colors" />
                        </div>
                    )}

                    {/* Remove Button (Hide during reorder or if locked) */}
                    {participant && !isReordering && !isLocked && (
                        <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center cursor-pointer z-10 hidden group-hover:flex"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(participant.id, index);
                            }}
                        >
                            <X className="w-3 h-3 text-white" />
                        </div>
                    )}

                    {/* Lock Icon for locked slots */}
                    {isLocked && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center z-10">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    )}

                </div>

                {/* Remove via main click (disabled if locked) */}
                {participant && !isReordering && !isLocked && (
                    <button
                        className="absolute inset-0 w-full h-full opacity-0 z-0"
                        onClick={() => onRemove(participant.id, index)}
                        aria-label="Remove participant"
                    />
                )}


                {/* Label with turn number */}
                <div className="flex flex-col items-center mt-2 pointer-events-none">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${participant ? "text-[#EC1D99]" : "text-gray-600"}`}>
                        #{index + 1}
                    </span>
                    <span className={`text-xs text-center font-medium max-w-[64px] truncate mt-0.5 ${participant ? "text-white" : "text-gray-500"
                        }`}>
                        {participant
                            ? (isCurrentUser ? "You" : participant.name.split(" ")[0])
                            : "Open"
                        }
                    </span>
                </div>
            </div>

            {/* Connector line */}
            {!isLast && (
                <div className="h-14 w-8 flex items-center justify-center flex-shrink-0">
                    <div className="w-full h-0.5 bg-gray-700 rounded-full" />
                </div>
            )}
        </Reorder.Item>
    );
};

export default StorySlotItem;
