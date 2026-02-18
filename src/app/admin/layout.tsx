'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    LayoutDashboard,
    AlertTriangle,
    Film,
    Users,
    UsersRound,
    Building2,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Settings,
} from 'lucide-react';

interface AdminUser {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/communities', icon: Building2, label: 'Communities' },
    { href: '/admin/reports', icon: AlertTriangle, label: 'Reports' },
    { href: '/admin/stories', icon: Film, label: 'Stories' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/groups', icon: UsersRound, label: 'Groups' },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [currentPath, setCurrentPath] = useState('');

    useEffect(() => {
        checkAdminAccess();
    }, []);

    useEffect(() => {
        // Update current path for active state
        setCurrentPath(window.location.pathname);
    }, []);

    const checkAdminAccess = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                router.replace('/login');
                return;
            }

            // Check if user is admin - note: user_id matches auth.users.id
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, name, avatar, is_admin')
                .eq('user_id', session.user.id)
                .single();

            if (error || !profile?.is_admin) {
                router.replace('/feed');
                return;
            }

            setAdminUser({
                id: profile.id,
                name: profile.name,
                email: session.user.email || '',
                avatar: profile.avatar,
            });
            setIsAuthorized(true);
        } catch (err) {
            console.error('[Admin] Auth check failed:', err);
            router.replace('/feed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-400 text-sm">Checking access...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex">
            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full bg-zinc-900 border-r border-zinc-800 transition-all duration-300 z-50 ${sidebarCollapsed ? 'w-16' : 'w-64'
                    }`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">W</span>
                            </div>
                            <span className="font-semibold text-white">Admin</span>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                        {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = currentPath === item.href ||
                            (item.href !== '/admin' && currentPath.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setCurrentPath(item.href)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-pink-500/10 text-pink-400'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-zinc-800">
                    {!sidebarCollapsed && adminUser && (
                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                                {adminUser.avatar ? (
                                    <img src={adminUser.avatar} alt={adminUser.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs text-zinc-400">{adminUser.name?.[0]?.toUpperCase()}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{adminUser.name}</p>
                                <p className="text-xs text-zinc-500 truncate">{adminUser.email}</p>
                            </div>
                        </div>
                    )}
                    <div className="space-y-1">
                        <Link
                            href="/settings"
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <Settings size={18} />
                            {!sidebarCollapsed && <span className="text-sm">Settings</span>}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                        >
                            <LogOut size={18} />
                            {!sidebarCollapsed && <span className="text-sm">Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                <div className="min-h-screen p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
