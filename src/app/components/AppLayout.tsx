"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusSquare, User, Users, Compass } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "./AuthProvider";
import NotificationBell from "./NotificationBell";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import { useKeyboard } from "@/hooks/useKeyboard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    useDataRefresh(); // Global data refresh hook for keeping data up-to-date
    const pathname = usePathname();
    const { currentUser, stories } = useStore();


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

    // Hide bottom nav only on create-story page for full screen composition
    const hideBottomNav = pathname === "/create-story";
    // Also hide nav during initial load when there are no stories yet (prevents flash)
    const isInitialLoad = pathname === "/feed" && stories.length === 0;
    const isKeyboardOpen = useKeyboard();
    const showNavigation = !!user && !hideBottomNav && !isInitialLoad && !isKeyboardOpen;

    return (
        <div className="flex justify-center min-h-[100dvh] bg-black text-white">
            {/* Mobile Container - Centered on Desktop */}
            <div className="w-full max-w-md bg-black h-[100dvh] flex flex-col relative shadow-2xl overflow-hidden border-x border-gray-800 safe-area-pt">

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
                    <nav className="shrink-0 bg-black border-t border-gray-800 px-6 pt-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-between items-center z-50">
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
                    </nav>
                )}
            </div>
        </div >
    );
}
