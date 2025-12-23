"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import WorldMap from "@/app/components/WorldMap";

export default function WorldMapPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-4 border-b border-gray-800">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">Weeve World</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-4xl h-[60vh] min-h-[400px]">
                    <WorldMap />
                </div>
            </div>
        </div>
    );
}
