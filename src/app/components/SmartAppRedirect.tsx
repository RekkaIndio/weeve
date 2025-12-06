'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * SmartAppRedirect - Intelligently redirects users to the native app if available,
 * otherwise to the appropriate app store, or web app as fallback
 */
export default function SmartAppRedirect() {
    const searchParams = useSearchParams();
    const [platform, setPlatform] = useState<'ios' | 'android' | 'web' | null>(null);
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        const detectPlatform = () => {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
            
            // iOS detection
            if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
                return 'ios';
            }
            
            // Android detection
            if (/android/i.test(userAgent)) {
                return 'android';
            }
            
            return 'web';
        };

        setPlatform(detectPlatform());
    }, []);

    useEffect(() => {
        if (!platform || platform === 'web' || redirecting) return;

        const ref = searchParams?.get('ref');
        const attemptAppRedirect = () => {
            setRedirecting(true);

            // Build deep link with referral code if present
            const deepLink = ref 
                ? `weeve://signup?ref=${ref}`
                : 'weeve://feed';

            // iOS App Store URL
            const iosAppStoreUrl = 'https://apps.apple.com/app/weeve/idXXXXXXXXXX'; // TODO: Replace with actual App Store ID
            
            // Android Play Store URL
            const androidPlayStoreUrl = 'https://play.google.com/store/apps/details?id=com.weeve.app';

            if (platform === 'ios') {
                // Try to open the app via deep link
                window.location.href = deepLink;

                // If app doesn't open within 2 seconds, redirect to App Store
                setTimeout(() => {
                    // Check if still on page (app didn't open)
                    if (!document.hidden) {
                        window.location.href = iosAppStoreUrl;
                    }
                }, 2000);
            } else if (platform === 'android') {
                // Try to open the app via deep link
                window.location.href = deepLink;

                // If app doesn't open within 2 seconds, redirect to Play Store
                setTimeout(() => {
                    if (!document.hidden) {
                        window.location.href = androidPlayStoreUrl;
                    }
                }, 2000);
            }
        };

        // Wait a moment to show the redirect message
        const timer = setTimeout(attemptAppRedirect, 500);
        return () => clearTimeout(timer);
    }, [platform, searchParams, redirecting]);

    // Don't show anything for web users or before detection
    if (!platform || platform === 'web') {
        return null;
    }

    // Show loading state while redirecting
    if (redirecting) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                <div className="text-center">
                    <div className="mb-4">
                        <div className="w-16 h-16 mx-auto border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-white text-lg font-semibold">Opening Weeve...</p>
                    <p className="text-gray-400 text-sm mt-2">
                        {platform === 'ios' ? 'Redirecting to App Store if not installed' : 'Redirecting to Play Store if not installed'}
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
