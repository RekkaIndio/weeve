"use client";

import { useEffect } from 'react';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import NotificationToast from './NotificationToast';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

const PushNotificationInitializer = () => {
    const { currentUser } = useStore();

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
                    // On Android, this might not be strictly necessary if auto-init is on,
                    // but on iOS it ensures APNs registration.
                    // For this plugin, currently we often use getToken() to force registration or register listeners.
                    // However, we'll stick to setting up listeners which usually triggers what's needed.
                    console.log('[Push] Permissions granted');

                    // Explicitly get token to ensure we have one, though the listener should catch refreshes
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
            console.log('[Push] Token received:', token);
            const user = useStore.getState().currentUser;

            if (user?.id) {
                console.log('[Push] Saving token for user:', user.id);
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
                const notification = event.notification;
                toast.custom((t) => (
                    <NotificationToast
                        title={notification.title || 'Weeve'}
                        body={notification.body || ''}
                        onDismiss={() => toast.dismiss(t)}
                    />
                ));
            });

            // Notification tap/action listener
            await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
                console.log('[Push] Action performed:', JSON.stringify(event));
                // Define navigation logic here via router if needed
                // const router = useRouter() ... need to think about how to inject router here or use window location
            });
        };

        // Initialize
        addListeners();
        registerPush();

    }, [currentUser?.id]); // Re-run if user changes to ensure token is saved to new user

    return null;
};

export default PushNotificationInitializer;
