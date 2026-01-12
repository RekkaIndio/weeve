"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusSquare, User, Users, Compass } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "./AuthProvider";
import NotificationBell from "./NotificationBell";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useVideoExportOptional } from "./VideoExport/VideoExportContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    useDataRefresh(); // Global data refresh hook for keeping data up-to-date
    const pathname = usePathname();
    const { currentUser, stories } = useStore();
    const videoExport = useVideoExportOptional();
    const [showExportBar, setShowExportBar] = useState(false);

    // Show/hide export progress bar
    useEffect(() => {
        if (videoExport?.isExporting) {
            setShowExportBar(true);
        } else if (videoExport?.isComplete) {
            // Keep showing for a moment then hide
            const timer = setTimeout(() => {
                setShowExportBar(false);
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setShowExportBar(false);
        }
    }, [videoExport?.isExporting, videoExport?.isComplete]);

    // Calculate if it's user's turn in any story
    const myTurnCount = currentUser ? stories.filter(
        (s) => s.status === "active" && s.currentTurnUserId === currentUser.id
    ).length : 0;

    // Mock notification count (you can replace this with actual notification logic)
    const notificationCount = 3;

    const navItems = [
        { label: "Home", href: "/feed", icon: Home },
        { label: "Discover", href: "/discover", icon: Compass },
        { label: "Create", href: "/create-story", icon: PlusSquare },
        { label: "Groups", href: "/groups", icon: Users },
        { label: "Profile", href: "/profile", icon: User },
    ];

    const showHomeNotification = currentUser && pathname === "/feed";
    const isHome = pathname === "/feed";

    // Hide bottom nav on create-story page and conversation pages for full screen experience
    const hideBottomNav = pathname === "/create-story" || pathname?.startsWith("/inbox/");
    // Also hide nav during initial load when there are no stories yet (prevents flash)
    const isInitialLoad = pathname === "/feed" && stories.length === 0;
    const isKeyboardOpen = useKeyboard();
    const showNavigation = !!user && !hideBottomNav && !isInitialLoad && !isKeyboardOpen;

    return (
        <div className="flex justify-center min-h-[100dvh] bg-black text-white">
            {/* Mobile/Tablet Container - Centered on Desktop */}
            <div className="w-full md:max-w-2xl lg:max-w-5xl bg-black h-[100dvh] flex flex-col relative shadow-2xl overflow-hidden border-x border-gray-800 safe-area-pt transition-all duration-300">

                {showHomeNotification && (
                    <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-2 flex justify-end gap-3 pointer-events-none">
                        <NotificationBell
                            userId={currentUser?.id}
                            className="bg-black/70 border border-white/10 backdrop-blur-md shadow-lg pointer-events-auto"
                        />
                    </div>
                )}

                {/* Main Content */}
                <main className={`flex-1 min-h-0 ${isHome ? "overflow-hidden" : "overflow-y-auto scrollbar-hide"}`}>
                    {children}
                </main>

                {/* Bottom Nav */}
                {showNavigation && (
                    <>
                        {/* Export Progress Line - positioned above nav */}
                        {showExportBar && videoExport && (
                            <div className="shrink-0 h-[2px] bg-gray-800 relative overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ease-out ${videoExport.isComplete
                                        ? 'bg-green-500'
                                        : 'bg-[#EC1D99]'
                                        }`}
                                    style={{ width: `${videoExport.progress}%` }}
                                />
                                {videoExport.isExporting && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                )}
                            </div>
                        )}
                        <nav className="shrink-0 bg-black border-t border-gray-800 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-50">
                            <div className="max-w-md mx-auto px-6 pt-3 flex justify-between items-center">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    const isCreate = item.label === 'Create';

                                    if (isCreate) {
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className="flex flex-col items-center justify-center -mt-4"
                                            >
                                                <div className="w-12 h-12 bg-[#EC1D99] rounded-full flex items-center justify-center shadow-lg shadow-pink-500/20 transform transition-transform active:scale-95">
                                                    <item.icon className="w-6 h-6 text-white" />
                                                </div>
                                            </Link>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex flex-col items-center gap-1 transition-colors ${isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                                                }`}
                                        >
                                            <div className="relative">
                                                {item.label === "Profile" && currentUser ? (
                                                    <img
                                                        src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name)}`}
                                                        alt="Profile"
                                                        className={`w-6 h-6 rounded-full object-cover ${isActive ? "ring-2 ring-[#EC1D99]" : ""}`}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name)}`;
                                                        }}
                                                    />
                                                ) : (
                                                    <item.icon className="w-6 h-6" />
                                                )}
                                                {item.label === "Home" && myTurnCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#EC1D99] rounded-full border-2 border-black" />
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </nav>
                    </>
                )}
            </div>
        </div>
    );
}
