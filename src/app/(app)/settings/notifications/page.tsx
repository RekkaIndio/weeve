"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface NotificationPreferences {
    push_notifications: boolean;
    email_notifications: boolean;
    story_invites: boolean;
    story_turns: boolean;
    story_completed: boolean;
    story_likes: boolean;
    story_comments: boolean;
    friend_requests: boolean;
    friend_accepted: boolean;
    group_invites: boolean;
    group_updates: boolean;
}

const defaultPreferences: NotificationPreferences = {
    push_notifications: true,
    email_notifications: true,
    story_invites: true,
    story_turns: true,
    story_completed: true,
    story_likes: true,
    story_comments: true,
    friend_requests: true,
    friend_accepted: true,
    group_invites: true,
    group_updates: true,
};

export default function NotificationsPage() {
    const router = useRouter();
    const { currentUser } = useStore();
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentUser) {
            fetchPreferences();
        }
    }, [currentUser]);

    const fetchPreferences = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                setPreferences(data as NotificationPreferences);
            }
        } catch (error) {
            console.error('Error fetching notification preferences:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
        if (!currentUser || isSaving) return;

        const newPreferences = { ...preferences, [key]: value };
        setPreferences(newPreferences);

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('notification_preferences')
                .upsert({
                    user_id: currentUser.id,
                    ...newPreferences,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            // Revert on error
            setPreferences(preferences);
            toast.error('Failed to update preferences');
        } finally {
            setIsSaving(false);
        }
    };

    const ToggleSwitch = ({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
        <button
            type="button"
            onClick={onChange}
            disabled={disabled}
            className={`relative w-12 h-6 transition duration-200 ease-in-out rounded-full overflow-hidden ${enabled ? 'bg-[#EC1D99]' : 'bg-gray-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`absolute top-1 ${enabled ? 'left-7' : 'left-1'
                    } bg-white w-4 h-4 rounded-full transition-all duration-200`}
            />
        </button>
    );

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white">
                <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-4 border-b border-gray-800">
                    <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-800 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="font-bold text-lg">Notifications</h1>
                </div>
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
                </div>
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
                <h1 className="font-bold text-lg">Notifications</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Info Box */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Bell className="w-5 h-5 text-[#EC1D99] flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-sm mb-1">Manage Notifications</h3>
                            <p className="text-xs text-gray-400">
                                Control which notifications you receive. Changes are saved automatically.
                            </p>
                        </div>
                    </div>
                </div>

                {/* General Notifications */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">
                        General
                    </h3>
                    <div className="bg-gray-900 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <div>
                                <span className="font-medium">Push Notifications</span>
                                <p className="text-xs text-gray-500 mt-0.5">Receive notifications on your device</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.push_notifications}
                                onChange={() => updatePreference('push_notifications', !preferences.push_notifications)}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <div>
                                <span className="font-medium">Email Notifications</span>
                                <p className="text-xs text-gray-500 mt-0.5">Receive updates via email</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.email_notifications}
                                onChange={() => updatePreference('email_notifications', !preferences.email_notifications)}
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                </div>

                {/* Story Notifications */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">
                        Stories
                    </h3>
                    <div className="bg-gray-900 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <div>
                                <span className="font-medium">Story Invites</span>
                                <p className="text-xs text-gray-500 mt-0.5">When someone invites you to a story</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.story_invites}
                                onChange={() => updatePreference('story_invites', !preferences.story_invites)}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <div>
                                <span className="font-medium">Your Turn</span>
                                <p className="text-xs text-gray-500 mt-0.5">When it's your turn in a story</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.story_turns}
                                onChange={() => updatePreference('story_turns', !preferences.story_turns)}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <div>
                                <span className="font-medium">Story Completed</span>
                                <p className="text-xs text-gray-500 mt-0.5">When a story you're in is completed</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.story_completed}
                                onChange={() => updatePreference('story_completed', !preferences.story_completed)}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <div>
                                <span className="font-medium">Likes</span>
                                <p className="text-xs text-gray-500 mt-0.5">When someone likes your story</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.story_likes}
                                onChange={() => updatePreference('story_likes', !preferences.story_likes)}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <div>
                                <span className="font-medium">Comments</span>
                                <p className="text-xs text-gray-500 mt-0.5">When someone comments on your story</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.story_comments}
                                onChange={() => updatePreference('story_comments', !preferences.story_comments)}
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                </div>

                {/* Social Notifications */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">
                        Social
                    </h3>
                    <div className="bg-gray-900 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <div>
                                <span className="font-medium">Friend Requests</span>
                                <p className="text-xs text-gray-500 mt-0.5">When someone sends you a friend request</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.friend_requests}
                                onChange={() => updatePreference('friend_requests', !preferences.friend_requests)}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <div>
                                <span className="font-medium">Friend Accepted</span>
                                <p className="text-xs text-gray-500 mt-0.5">When someone accepts your friend request</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.friend_accepted}
                                onChange={() => updatePreference('friend_accepted', !preferences.friend_accepted)}
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                </div>

                {/* Group Notifications */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">
                        Groups
                    </h3>
                    <div className="bg-gray-900 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <div>
                                <span className="font-medium">Group Invites</span>
                                <p className="text-xs text-gray-500 mt-0.5">When you're invited to join a group</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.group_invites}
                                onChange={() => updatePreference('group_invites', !preferences.group_invites)}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <div>
                                <span className="font-medium">Group Updates</span>
                                <p className="text-xs text-gray-500 mt-0.5">Updates from groups you're in</p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.group_updates}
                                onChange={() => updatePreference('group_updates', !preferences.group_updates)}
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                </div>
                {/* Debugging / Testing */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">
                        Debugging
                    </h3>
                    <div className="bg-gray-900 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                            <div>
                                <span className="font-medium">Test Push Notification</span>
                                <p className="text-xs text-gray-500 mt-0.5">Send a test notification to this device</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!currentUser) return;

                                    toast.promise(
                                        async () => {
                                            // 1. Check if we have a token
                                            const { data: profile } = await supabase
                                                .from('profiles')
                                                .select('push_token')
                                                .eq('user_id', currentUser.id)
                                                .single();

                                            if (!profile?.push_token) {
                                                throw new Error('No push token found for this device. Please enable push notifications first.');
                                            }

                                            // 2. Create test notification
                                            const { error } = await supabase
                                                .from('notifications')
                                                .insert({
                                                    user_id: currentUser.id,
                                                    type: 'new_message', // Using a generic type that usually triggers push
                                                    title: 'Test Notification',
                                                    message: 'This is a test notification to verify your device is configured correctly.',
                                                    data: { test: 'true' },
                                                    read: false,
                                                });

                                            if (error) throw error;
                                        },
                                        {
                                            loading: 'Sending test notification...',
                                            success: 'Test notification sent! It should appear shortly.',
                                            error: (e) => e.message || 'Failed to send test notification',
                                        }
                                    );
                                }}
                                className="px-4 py-2 bg-[#EC1D99] text-white text-sm font-semibold rounded-full hover:bg-[#d41b8a] transition-colors"
                            >
                                Test Push
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
