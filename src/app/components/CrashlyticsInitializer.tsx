'use client';

import { useEffect } from 'react';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

export default function CrashlyticsInitializer() {
    useEffect(() => {
        const initCrashlytics = async () => {
            // Only run on native platforms
            if (Capacitor.isNativePlatform()) {
                try {
                    // Just logging to confirm it's active. 
                    // In a real app, we might set user context here if available.
                    console.log('Firebase Crashlytics active');

                    // Example custom key to verify JS interaction
                    await FirebaseCrashlytics.log({ message: 'App started' });
                    // To test a crash, you can uncomment the following line (if method exists) or throw an error in native code
                    // await FirebaseCrashlytics.crash({ message: 'Test Crash' });
                } catch (e) {
                    console.error('Firebase Crashlytics error', e);
                }
            }
        };

        initCrashlytics();
    }, []);

    return null;
}
