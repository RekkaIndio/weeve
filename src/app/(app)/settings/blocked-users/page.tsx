"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, UserX, Search, MoreVertical } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface BlockedUser {
    id: string;
    user_id: string;
    blocked_user_id: string;
    created_at: string;
    blocked_user: {
        user_id: string;
        name: string;
        avatar: string | null;
    };
}

export default function BlockedUsersPage() {
    const router = useRouter();
    const { currentUser } = useStore();
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser) {
            fetchBlockedUsers();
        }
    }, [currentUser]);

    const fetchBlockedUsers = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('blocked_users')
                .select(`
                    *,
                    blocked_user:blocked_user_id (
                        user_id,
                        name,
                        avatar
                    )
                `)
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setBlockedUsers((data as any) || []);
        } catch (error) {
            console.error('Error fetching blocked users:', error);
            toast.error('Failed to load blocked users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnblock = async (blockedUserId: string) => {
        if (!currentUser || unblockingId) return;

        setUnblockingId(blockedUserId);
        try {
            const { error } = await supabase
                .from('blocked_users')
                .delete()
                .match({ user_id: currentUser.id, blocked_user_id: blockedUserId });

            if (error) throw error;

            setBlockedUsers(blockedUsers.filter(bu => bu.blocked_user_id !== blockedUserId));
            toast.success('User unblocked');
        } catch (error) {
            console.error('Error unblocking user:', error);
            toast.error('Failed to unblock user');
        } finally {
            setUnblockingId(null);
        }
    };

    const filteredUsers = blockedUsers.filter(bu =>
        bu.blocked_user?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

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
                <h1 className="font-bold text-lg">Blocked Users</h1>
            </div>

            <div className="p-4">
                {/* Search Bar */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search blocked users..."
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#EC1D99] transition-colors"
                    />
                </div>

                {/* Info Box */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <UserX className="w-5 h-5 text-[#EC1D99] flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-sm mb-1">About Blocked Users</h3>
                            <p className="text-xs text-gray-400">
                                Blocked users cannot see your profile, send you messages, or invite you to stories.
                                They won't be notified that you've blocked them.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <UserX className="w-16 h-16 text-gray-700 mb-4" />
                        <h3 className="font-bold text-lg mb-2">
                            {searchQuery ? 'No users found' : 'No blocked users'}
                        </h3>
                        <p className="text-sm text-gray-500 max-w-xs">
                            {searchQuery
                                ? 'Try adjusting your search'
                                : "You haven't blocked anyone yet. When you block someone, they'll appear here."}
                        </p>
                    </div>
                ) : (
                    /* Blocked Users List */
                    <div className="space-y-2">
                        {filteredUsers.map((blockedUser) => (
                            <div
                                key={blockedUser.id}
                                className="bg-gray-900 rounded-lg p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={blockedUser.blocked_user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${blockedUser.blocked_user_id}`}
                                        alt={blockedUser.blocked_user?.name}
                                        className="w-12 h-12 rounded-full border-2 border-gray-700"
                                    />
                                    <div>
                                        <h3 className="font-semibold">
                                            {blockedUser.blocked_user?.name}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            Blocked {new Date(blockedUser.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUnblock(blockedUser.blocked_user_id)}
                                    disabled={unblockingId === blockedUser.blocked_user_id}
                                    className={`${unblockingId === blockedUser.blocked_user_id
                                            ? 'bg-gray-700 cursor-not-allowed'
                                            : 'bg-gray-800 hover:bg-gray-700'
                                        } text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors`}
                                >
                                    {unblockingId === blockedUser.blocked_user_id ? 'Unblocking...' : 'Unblock'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
