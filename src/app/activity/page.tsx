"use client";

import { useStore } from "@/lib/store";
import { UserPlus, Heart, MessageCircle, AtSign } from "lucide-react";

export default function ActivityPage() {
    // Mock notifications
    const notifications = [
        { id: 1, type: 'invite', user: 'Alice', content: 'invited you to join "The Lost City"', time: '2m ago', icon: UserPlus, color: 'bg-blue-500' },
        { id: 2, type: 'like', user: 'Bob', content: 'liked your contribution in "Morning Routine"', time: '1h ago', icon: Heart, color: 'bg-pink-500' },
        { id: 3, type: 'mention', user: 'Carol', content: 'mentioned you in a comment', time: '3h ago', icon: AtSign, color: 'bg-purple-500' },
        { id: 4, type: 'comment', user: 'David', content: 'commented: "This is amazing!"', time: '5h ago', icon: MessageCircle, color: 'bg-green-500' },
    ];

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-24">
            <h1 className="text-2xl font-bold mb-6 font-poppins">Activity</h1>

            <div className="space-y-6">
                <div>
                    <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">New</h2>
                    <div className="space-y-4">
                        {notifications.slice(0, 2).map(notif => (
                            <NotificationItem key={notif.id} item={notif} />
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Earlier</h2>
                    <div className="space-y-4">
                        {notifications.slice(2).map(notif => (
                            <NotificationItem key={notif.id} item={notif} />
                        ))}
                        {/* More mock items */}
                        <NotificationItem item={{ id: 5, type: 'like', user: 'Emma', content: 'liked your story', time: '1d ago', icon: Heart, color: 'bg-pink-500' }} />
                        <NotificationItem item={{ id: 6, type: 'invite', user: 'Frank', content: 'invited you to "Space Odyssey"', time: '2d ago', icon: UserPlus, color: 'bg-blue-500' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function NotificationItem({ item }: { item: any }) {
    return (
        <div className="flex items-start gap-4">
            <div className="relative shrink-0">
                <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user}`}
                    alt={item.user}
                    className="w-12 h-12 rounded-full bg-gray-800"
                />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-3 h-3 text-white" />
                </div>
            </div>
            <div className="flex-1 pt-1">
                <p className="text-sm text-gray-200">
                    <span className="font-bold text-white">{item.user}</span> {item.content}
                </p>
                <p className="text-xs text-gray-500 mt-1">{item.time}</p>
            </div>
            {item.type === 'invite' && (
                <button className="px-4 py-1.5 bg-[#EC1D99] text-white text-xs font-bold rounded-full hover:bg-[#D41C84] transition-colors">
                    Join
                </button>
            )}
        </div>
    );
}
