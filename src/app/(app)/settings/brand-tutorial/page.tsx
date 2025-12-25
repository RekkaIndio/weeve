"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import BrandTutorialOverlay from "@/app/components/BrandTutorialOverlay";
import { useStore } from "@/lib/store";
import { useEffect } from "react";

export default function BrandTutorialPage() {
    const router = useRouter();
    const { currentUser } = useStore();

    // Redirect non-brand users
    useEffect(() => {
        if (currentUser && !currentUser.isBrand) {
            router.push('/settings');
        }
    }, [currentUser, router]);

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    // Don't render for non-brand users
    if (!currentUser.isBrand) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-4 border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="font-bold text-lg">How Canon & Seed Work</h1>
                    <p className="text-xs text-gray-400">Learn about brand posts</p>
                </div>
            </div>

            {/* Tutorial Content */}
            <BrandTutorialOverlay
                onDismiss={() => router.push('/settings')}
            />
        </div>
    );
}
