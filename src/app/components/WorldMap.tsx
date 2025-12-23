"use client";

import { Sparkles, Globe } from "lucide-react";

export default function WorldMap() {
    return (
        <div className="w-full h-full bg-[#080808] rounded-xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col items-center justify-center p-8 text-center relative">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent opacity-50" />
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-md">
                <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 ring-4 ring-gray-800 shadow-xl">
                    <Globe className="w-10 h-10 text-[#EC1D99]" />
                </div>

                <div className="px-4 py-1.5 bg-[#EC1D99]/10 rounded-full border border-[#EC1D99]/20 mb-6">
                    <span className="text-[#EC1D99] font-bold tracking-wider text-xs uppercase">Coming Soon</span>
                </div>

                <h2 className="text-3xl font-bold text-white mb-4">Weeve World</h2>

                <div className="space-y-4 text-gray-400 text-sm leading-relaxed">
                    <p>
                        We're building a new way to visualize your global impact.
                        Soon, you'll be able to see exactly where your stories travel and who they connect with.
                    </p>
                    <p>
                        Track your Weeves as they span continents and bring people together across the world.
                    </p>
                </div>
            </div>
        </div>
    );
}
