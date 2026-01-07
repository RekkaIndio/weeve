"use client";

import { X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const confirmButtonClass = variant === 'danger'
        ? 'bg-red-500 text-white hover:bg-red-600'
        : 'bg-[#EC1D99] text-white hover:bg-[#D41C84]';

    const titleClass = variant === 'danger'
        ? 'text-xl font-bold mb-2 text-red-400'
        : 'text-xl font-bold mb-2';

    return (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full">
                <h2 className={titleClass}>{title}</h2>
                <div className="text-gray-400 text-sm mb-6">
                    {message}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${confirmButtonClass}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
