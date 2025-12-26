"use client";

import { useEffect } from 'react';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

const PushNotificationInitializer = () => {
    useEffect(() => {
        if (Capacitor.getPlatform() === 'web') {
            // Push notifications are not supported on web in this implementation
            return;
        }

        const setUpPushNotifications = async () => {
            try {
                const permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    const newPermStatus = await PushNotifications.requestPermissions();
                    if (newPermStatus.receive === 'granted') {
                        await PushNotifications.register();
                    }
                } else if (permStatus.receive === 'granted') {
                    await PushNotifications.register();
                }
            } catch (e) {
                console.error('Error initializing push notifications', e);
            }
        };

        setUpPushNotifications();

        const addListeners = async () => {
            await PushNotifications.removeAllListeners();

            PushNotifications.addListener('registration', (token: Token) => {
                console.log('Push registration success, token: ' + token.value);
                // TODO: Send token to backend
            });

            PushNotifications.addListener('registrationError', (error: any) => {
                console.error('Error on registration: ' + JSON.stringify(error));
            });

            PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
                console.log('Push received: ' + JSON.stringify(notification));
                toast.info(notification.title || 'New Notification', {
                    description: notification.body,
                });
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
                console.log('Push action performed: ' + JSON.stringify(notification));
                // Header listener if you want to navigate
            });
        }

        addListeners();

    }, []);

    return null;
};

export default PushNotificationInitializer;
