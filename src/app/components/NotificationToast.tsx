"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";

interface NotificationToastProps {
    title: string;
    body: string;
    onDismiss: () => void;
}

export default function NotificationToast({ title, body, onDismiss }: NotificationToastProps) {
    return (
        <div className="w-full flex items-center gap-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 p-4 rounded-2xl shadow-2xl shadow-black/10 ring-1 ring-black/5">
            <div className="shrink-0 size-10 rounded-xl bg-black dark:bg-white flex items-center justify-center shadow-sm">
                {/* Using text fallback if image fails, or generic icon */}
                <span className="text-white dark:text-black font-bold text-lg">W</span>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                {title && (
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-0.5">
                        {title}
                    </p>
                )}
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                    {body}
                </p>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                }}
                className="shrink-0 p-1.5 -mr-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
                <XMarkIcon className="size-4" />
            </button>
        </div>
    );
}
