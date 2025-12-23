"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, UserPlus, MessageCircle, Heart, Users, Loader, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    subscribeToNotifications,
    deleteNotification,
    type Notification
} from '@/lib/notifications';
import { acceptFriendRequest, declineFriendRequest, getFriendRequests, type FriendRequest } from '@/lib/friends';
import { toast } from 'sonner';

interface NotificationsListProps {
    userId: string;
    onNotificationCountChange?: (count: number) => void;
}

export default function NotificationsList({ userId, onNotificationCountChange }: NotificationsListProps) {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'requests' | 'stories' | 'groups'>('all');
    const [isDraggingId, setIsDraggingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();

        // Subscribe to real-time notifications
        const unsubscribe = subscribeToNotifications(userId, (newNotification) => {
            setNotifications(prev => {
                const updated = [newNotification, ...prev];
                if (onNotificationCountChange) {
                    const unreadCount = updated.filter(n => !n.read).length + friendRequests.length;
                    onNotificationCountChange(unreadCount);
                }
                return updated;
            });
        });

        return () => unsubscribe();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        const [notifs, requests] = await Promise.all([
            getNotifications(userId),
            getFriendRequests(userId)
        ]);
        setNotifications(notifs);
        setFriendRequests(requests.received);

        const unreadCount = notifs.filter(n => !n.read).length + requests.received.length;
        if (onNotificationCountChange) {
            onNotificationCountChange(unreadCount);
        }
        setLoading(false);
    };

    const handleMarkAsRead = async (notificationId: string) => {
        await markAsRead(notificationId);
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        if (onNotificationCountChange) {
            const unreadCount = notifications.filter(n => !n.read && n.id !== notificationId).length + friendRequests.length;
            onNotificationCountChange(unreadCount);
        }
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead(userId);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        if (onNotificationCountChange) {
            onNotificationCountChange(friendRequests.length);
        }
        toast.success('All notifications marked as read');
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await handleMarkAsRead(notification.id);
        }
        if (notification.action_url) {
            router.push(notification.action_url);
        } else if (notification.data) {
            // Fallback navigation logic
            const { type, data } = notification;

            if (type === 'friend_accepted' || type === 'friend_request' || type === 'new_follower') {
                const profileId = data.sender_id || data.user_id || data.friend_id || data.follower_id;
                if (profileId) router.push(`/profile/${profileId}`);
            }
            else if (type.startsWith('group_')) {
                if (data.group_id) router.push(`/groups/${data.group_id}`);
            }
            else if (type === 'mention' || type === 'your_turn' || type === 'turn_skipped' || type === 'timer_expired') {
                if (data.story_id) router.push(`/story/${data.story_id}`);
            }
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        const success = await acceptFriendRequest(requestId);
        if (success) {
            toast.success('Friend request accepted!');
            setFriendRequests(prev => prev.filter(r => r.id !== requestId));
            if (onNotificationCountChange) {
                const unreadCount = notifications.filter(n => !n.read).length + friendRequests.length - 1;
                onNotificationCountChange(unreadCount);
            }
        } else {
            toast.error('Failed to accept request');
        }
    };

    const handleDeclineRequest = async (requestId: string) => {
        const success = await declineFriendRequest(requestId);
        if (success) {
            toast.success('Friend request declined');
            setFriendRequests(prev => prev.filter(r => r.id !== requestId));
            if (onNotificationCountChange) {
                const unreadCount = notifications.filter(n => !n.read).length + friendRequests.length - 1;
                onNotificationCountChange(unreadCount);
            }
        } else {
            toast.error('Failed to decline request');
        }
    };

    const handleDeleteNotification = async (notificationId: string) => {
        const original = notifications;
        const toDelete = notifications.find(n => n.id === notificationId);

        // Optimistic UI update
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (onNotificationCountChange) {
            const unreadCount = original.filter(n => !n.read && n.id !== notificationId).length + friendRequests.length;
            onNotificationCountChange(unreadCount);
        }

        try {
            const success = await deleteNotification(notificationId);
            if (!success) {
                setNotifications(original);
                toast.error('Failed to delete notification');
                return;
            }

            toast.success('Notification deleted');
        } catch (e) {
            setNotifications(original);
            toast.error('Failed to delete notification');
        }
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'friend_request':
            case 'friend_accepted':
            case 'new_follower':
                return <UserPlus className="w-5 h-5" />;
            case 'story_commented':
                return <MessageCircle className="w-5 h-5" />;
            case 'story_liked':
                return <Heart className="w-5 h-5" />;
            case 'group_invite':
            case 'group_update':
            case 'group_joined':
                return <Users className="w-5 h-5" />;
            default:
                return <Bell className="w-5 h-5" />;
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'requests') return n.type === 'friend_request' || n.type === 'friend_accepted';
        if (filter === 'stories') return n.type.startsWith('story_');
        if (filter === 'groups') return n.type.startsWith('group_');
        return true;
    });

    const showFriendRequests = filter === 'all' || filter === 'requests';

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Notifications</h1>
                {(notifications.some(n => !n.read) || friendRequests.length > 0) && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="text-sm text-[#EC1D99] hover:underline"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['all', 'requests', 'stories', 'groups'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === f
                            ? 'bg-[#EC1D99] text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Friend Requests Section */}
            {showFriendRequests && friendRequests.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-white mb-3">Friend Requests</h2>
                    <div className="space-y-3">
                        {friendRequests.map(request => (
                            <div
                                key={request.id}
                                className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4"
                            >
                                <img
                                    src={request.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.sender_name}`}
                                    alt={request.sender_name}
                                    className="w-12 h-12 rounded-full"
                                />
                                <div className="flex-1">
                                    <p className="text-white font-medium">{request.sender_name}</p>
                                    <p className="text-sm text-gray-400">Sent you a friend request</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAcceptRequest(request.id)}
                                        className="p-2 bg-[#EC1D99] hover:bg-[#D41C84] text-white rounded-full transition-colors"
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeclineRequest(request.id)}
                                        className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Notifications List */}
            {filteredNotifications.length > 0 ? (
                <div className="space-y-2">
                    <AnimatePresence>
                        {filteredNotifications.map(notification => (
                            <motion.div
                                key={notification.id}
                                layout
                                initial={{ x: 0, opacity: 1 }}
                                exit={{ x: -500, opacity: 0, transition: { duration: 0.18 } }}
                                whileTap={{ scale: 0.995 }}
                                drag="x"
                                dragMomentum={false}
                                dragConstraints={{ left: -240, right: 0 }}
                                dragElastic={0.08}
                                style={{ touchAction: 'pan-y' }}
                                onDragStart={() => setIsDraggingId(notification.id)}
                                onDragEnd={(event, info) => {
                                    setIsDraggingId(null);
                                    // Lowered delete threshold for mobile, and use offset to detect left swipe
                                    if (info.offset.x < -60) {
                                        handleDeleteNotification(notification.id);
                                    }
                                }}
                                onClick={() => { if (!isDraggingId) handleNotificationClick(notification); }}
                                className={`group relative p-4 rounded-lg border cursor-pointer transition-colors overflow-hidden ${notification.read
                                    ? 'bg-gray-900 border-gray-800 hover:bg-gray-850'
                                    : 'bg-gray-800 border-[#EC1D99]/30 hover:bg-gray-750'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-full ${notification.read ? 'bg-gray-800' : 'bg-[#EC1D99]/20'}`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-medium">{notification.title}</p>
                                        <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    {!notification.read && (
                                        <div className="w-2 h-2 bg-[#EC1D99] rounded-full"></div>
                                    )}
                                </div>

                                {/* Delete button (visible on hover or when dragging) */}
                                <div className="absolute inset-y-0 right-3 flex items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notification.id); }}
                                        className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-full"
                                        aria-label="Delete notification"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No notifications yet</p>
                </div>
            )}
        </div>
    );
}
