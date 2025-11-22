"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusSquare, User, Bell, Users, Compass } from "lucide-react";
import { useStore } from "@/lib/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { currentUser, stories } = useStore();

    // Calculate if it's user's turn in any story
    const myTurnCount = stories.filter(
        (s) => s.status === "active" && s.currentTurnUserId === currentUser.id
    ).length;

    // Mock notification count (you can replace this with actual notification logic)
    const notificationCount = 3;

    const navItems = [
        { label: "Home", href: "/", icon: Home },
        { label: "Discover", href: "/discover", icon: Compass },
        { label: "Create", href: "/create-story", icon: PlusSquare },
        { label: "Groups", href: "/groups", icon: Users },
        { label: "Profile", href: "/profile", icon: User },
    ];

    // Pages where we should hide the header (login, signup, or full-screen experiences)
    const hideHeaderRoutes = ['/login', '/signup', '/story', '/profile'];
    const shouldHideHeader = hideHeaderRoutes.some(route => pathname?.startsWith(route));

    return (
        <div className="flex justify-center min-h-screen bg-black text-white">
            {/* Mobile Container - Centered on Desktop */}
            <div className="w-full max-w-md bg-black h-screen flex flex-col relative shadow-2xl overflow-hidden border-x border-gray-800">

                {/* Floating Notification Bell - Top Right */}
                {currentUser.id !== 'guest' && !shouldHideHeader && (
                    <Link
                        href="/activity"
                        className="fixed top-4 right-4 z-50 p-2 transition-all hover:scale-105"
                        aria-label="Notifications"
                        style={{ maxWidth: '448px', right: 'max(1rem, calc(50% - 224px + 1rem))' }}
                    >
                        <Bell
                            className={`w-6 h-6 ${pathname === '/activity' ? 'text-[#EC1D99]' : 'text-white'}`}
                            strokeWidth={1.5}
                            style={{ filter: 'drop-shadow(0 0 2px rgba(107, 114, 128, 0.5))' }}
                        />
                        {notificationCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#EC1D99] rounded-full flex items-center justify-center text-[9px] font-bold">
                                {notificationCount > 9 ? '9+' : notificationCount}
                            </span>
                        )}
                    </Link>
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto scrollbar-hide">
                    {children}
                </main>

                {/* Bottom Nav */}
                {currentUser.id !== 'guest' && !['/login', '/signup'].includes(pathname || '') && (
                    <nav className="shrink-0 bg-black border-t border-gray-800 px-6 py-4 flex justify-between items-center z-50 safe-area-pb">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center gap-1 transition-colors ${isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                                        }`}
                                >
                                    <div className="relative">
                                        <item.icon className={`w-6 h-6 ${item.label === 'Create' ? 'w-7 h-7' : ''}`} />
                                        {item.label === "Home" && myTurnCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#EC1D99] rounded-full border-2 border-black" />
                                        )}
                                    </div>
                                    {/* Hide labels for cleaner look, or keep small */}
                                    {/* <span className="text-[10px] font-medium">{item.label}</span> */}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>
        </div>
    );
}
