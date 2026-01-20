"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

const PushNotificationInitializer = () => {
    const { currentUser } = useStore();
    const router = useRouter();

    useEffect(() => {
        if (Capacitor.getPlatform() === 'web') {
            return;
        }

        const registerPush = async () => {
            try {
                let permStatus = await FirebaseMessaging.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    permStatus = await FirebaseMessaging.requestPermissions();
                }

                if (permStatus.receive === 'granted') {
                    console.log('[Push] Permissions granted');

                    // Explicitly get token to ensure we have one
                    const result = await FirebaseMessaging.getToken();
                    if (result.token) {
                        saveTokenToSupabase(result.token);
                    }
                } else {
                    console.log('[Push] Permissions denied');
                }
            } catch (e) {
                console.error('[Push] Error initializing:', e);
            }
        };

        const saveTokenToSupabase = async (token: string) => {
            console.log('[Push] Token received');
            const user = useStore.getState().currentUser;

            if (user?.id) {
                console.log('[Push] Saving token for user');
                const { error } = await supabase
                    .from('profiles')
                    .update({ push_token: token })
                    .eq('user_id', user.id);

                if (error) {
                    console.error('[Push] Failed to save token to DB:', error);
                } else {
                    console.log('[Push] Token saved successfully to DB!');
                }
            } else {
                console.warn('[Push] No current user found, cannot save token.');
            }
        };

        const addListeners = async () => {
            await FirebaseMessaging.removeAllListeners();

            // Listener for token refreshes
            await FirebaseMessaging.addListener('tokenReceived', (event) => {
                saveTokenToSupabase(event.token);
            });

            // Foreground notification listener
            await FirebaseMessaging.addListener('notificationReceived', (event) => {
                console.log('[Push] Received:', JSON.stringify(event));
            });

            // Notification tap/action listener
            await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
                console.log('[Push] Action performed:', JSON.stringify(event));

                // Navigate to the action_url if present in notification data
                const notificationData = event.notification?.data as { action_url?: string } | undefined;
                const actionUrl = notificationData?.action_url;

                if (actionUrl && typeof actionUrl === 'string' && actionUrl.length > 0) {
                    console.log('[Push] Navigating to:', actionUrl);
                    router.push(actionUrl);
                }
            });
        };

        // Initialize
        addListeners();
        registerPush();

    }, [currentUser?.id, router]);

    return null;
};

export default PushNotificationInitializer;
