'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Smartphone } from 'lucide-react';

export default function AppRedirectPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        const detectPlatform = (): 'ios' | 'android' | 'web' => {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

            if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
                return 'ios';
            }

            if (/android/i.test(userAgent)) {
                return 'android';
            }

            return 'web';
        };

        const detectedPlatform = detectPlatform();
        setPlatform(detectedPlatform);

        // If web user, redirect to signup after countdown
        if (detectedPlatform === 'web') {
            const ref = searchParams?.get('ref');
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        router.push(ref ? `/signup?ref=${ref}` : '/signup');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [searchParams, router]);

    useEffect(() => {
        if (platform === 'web') return;

        const ref = searchParams?.get('ref');

        // Build deep link URLs
        // Scheme must match Info.plist (ios) and AndroidManifest.xml (android)
        const appScheme = 'com.weeve.app://';
        const deepLinkPath = ref ? `signup?ref=${ref}` : 'feed';
        const deepLink = `${appScheme}${deepLinkPath}`;

        // App Store URLs
        const iosAppStoreUrl = 'https://apps.apple.com/gb/app/weeve/id6757678144';
        const androidPlayStoreUrl = 'https://play.google.com/store/apps/details?id=com.weeve.app';
        const storeUrl = platform === 'ios' ? iosAppStoreUrl : androidPlayStoreUrl;

        // Try opening the app
        const attemptAppOpen = () => {
            // 1. Try direct location change (often works best for custom schemes)
            window.location.href = deepLink;

            // 2. Fallback to iframe (legacy method, sometimes helpful)
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = deepLink;
            document.body.appendChild(iframe);

            // Clean up iframe
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 500);
        };

        // Attempt to open app immediately
        attemptAppOpen();

        // Check if app opened after 2.5 seconds
        const fallbackTimer = setTimeout(() => {
            // If page is still visible (app didn't open), go to store
            if (!document.hidden) {
                window.location.href = storeUrl;
            }
        }, 2500);

        // If app opens, this page will be hidden
        const visibilityHandler = () => {
            if (document.hidden) {
                clearTimeout(fallbackTimer);
            }
        };
        document.addEventListener('visibilitychange', visibilityHandler);

        return () => {
            clearTimeout(fallbackTimer);
            document.removeEventListener('visibilitychange', visibilityHandler);
        };
    }, [platform, searchParams]);

    const ref = searchParams?.get('ref');
    // Helper to get store URL for the button
    const getStoreUrl = () => {
        if (platform === 'ios') return 'https://apps.apple.com/gb/app/weeve/id6757678144';
        if (platform === 'android') return 'https://play.google.com/store/apps/details?id=com.weeve.app';
        return '/signup';
    };

    if (platform === 'web') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="mb-6">
                        <img
                            src="/weeve-logo.png"
                            alt="Weeve"
                            className="w-24 h-24 mx-auto"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">
                        Welcome to Weeve!
                    </h1>
                    <p className="text-gray-400 mb-6">
                        Redirecting you to sign up in {countdown} second{countdown !== 1 ? 's' : ''}...
                    </p>
                    <div className="w-12 h-12 mx-auto border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                <div className="mb-6">
                    <Smartphone className="w-24 h-24 text-[#EC1D99] mx-auto mb-4" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">
                    Opening Weeve App...
                </h1>
                <p className="text-gray-400 mb-8">
                    {ref && (
                        <span className="block mb-2 text-[#EC1D99] font-semibold">
                            Invite code found!
                        </span>
                    )}
                    If the app doesn't open automatically, tap the button below.
                </p>

                <div className="mb-8">
                    <div className="w-16 h-16 mx-auto border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin mb-8" />

                    <a
                        href={getStoreUrl()}
                        className="inline-block px-8 py-4 bg-gradient-to-r from-[#EC1D99] to-purple-600 rounded-full font-bold text-white shadow-lg shadow-[#EC1D99]/20 hover:scale-105 transition-transform"
                    >
                        Download Weeve
                    </a>
                </div>

                <p className="text-sm text-gray-500">
                    Taking you to the {platform === 'ios' ? 'App Store' : 'Play Store'} if not installed.
                </p>
            </div>
        </div>
    );
}
