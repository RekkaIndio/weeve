"use client";

import { useStore } from "@/lib/store";
import NotificationsList from "@/app/components/NotificationsList";

export default function ActivityPage() {
    const { currentUser } = useStore();

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-gray-400">Please log in to view notifications</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            <NotificationsList userId={currentUser.id} />
        </div>
    );
}
