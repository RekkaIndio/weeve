"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2, AlertTriangle, Loader, ChevronRight } from "lucide-react";
import { deleteUserAccount } from "@/lib/auth";


const DELETE_REASONS = [
    "I'm not using Weeve enough",
    "I have a privacy concern",
    "I found a better alternative",
    "I have too many accounts",
    "Something was broken",
    "Other"
];

export default function DeleteAccountPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedReason, setSelectedReason] = useState("");
    const [feedback, setFeedback] = useState("");
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== "DELETE") return;

        setIsDeleting(true);
        try {
            const { success, error } = await deleteUserAccount(selectedReason, feedback);
            if (success) {
                // toast removed
                router.push('/');
            } else {
                throw error;
            }
        } catch (error) {
            console.error("Delete account error:", error);
            console.error("Failed to delete account");
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-4 border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">Delete Account</h1>
            </div>

            <div className="p-6 max-w-md mx-auto space-y-6">
                {step === 1 ? (
                    // Step 1: Survey
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold">We're sorry to see you go</h2>
                            <p className="text-gray-400">
                                We'd love to know why you're leaving so we can improve Weeve for everyone.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {DELETE_REASONS.map((reason) => (
                                <button
                                    key={reason}
                                    onClick={() => setSelectedReason(reason)}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${selectedReason === reason
                                        ? "border-[#EC1D99] bg-[#EC1D99]/10 text-white"
                                        : "border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700 hover:bg-gray-900"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{reason}</span>
                                        {selectedReason === reason && (
                                            <div className="w-4 h-4 rounded-full bg-[#EC1D99]" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {selectedReason && (
                            <div className="space-y-2 animate-in fade-in duration-300">
                                <label className="text-sm font-medium text-gray-400">
                                    Anything else you'd like to share? (Optional)
                                </label>
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Your feedback helps us improve..."
                                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#EC1D99] transition-colors resize-none h-32"
                                />
                            </div>
                        )}

                        <div className="pt-4">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!selectedReason}
                                className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                ) : (
                    // Step 2: Confirmation
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-red-500/10 border border-red-900/50 rounded-xl p-6 space-y-4">
                            <div className="flex items-center gap-3 text-red-500">
                                <AlertTriangle className="w-8 h-8" />
                                <h2 className="text-xl font-bold">Final Warning</h2>
                            </div>

                            <div className="space-y-3 text-gray-300">
                                <p>
                                    This action is <span className="font-bold text-red-500">permanent</span> and cannot be undone.
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                                    <li>Your profile will be deleted</li>
                                    <li>All your stories and contributions will be removed</li>
                                    <li>You will lose all friends and connections</li>
                                    <li>Your username will be released</li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">
                                To confirm, type <span className="font-mono text-white">DELETE</span> below:
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                placeholder="DELETE"
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors font-mono"
                            />
                        </div>

                        <div className="pt-4 space-y-3">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmation !== "DELETE" || isDeleting}
                                className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <Loader className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Trash2 className="w-5 h-5" />
                                        Delete Forever
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setStep(1)}
                                disabled={isDeleting}
                                className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
