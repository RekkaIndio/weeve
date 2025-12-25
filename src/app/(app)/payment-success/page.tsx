'use client';

import { useEffect, useState } from 'react';

export default function PaymentSuccessPage() {
    const [showManualLink, setShowManualLink] = useState(false);

    useEffect(() => {
        // We're in an external browser (Safari/Chrome) after Stripe payment
        // Need to use deep link to return to the app

        const deepLink = 'com.weeve.app://payment-success';

        console.log('[PaymentSuccess] Attempting to open app with deep link');

        // Strategy: Create a link and programmatically click it
        // This works better than window.location in some browsers
        const link = document.createElement('a');
        link.href = deepLink;
        link.style.display = 'none';
        document.body.appendChild(link);

        // Trigger the deep link
        link.click();

        // Also try window.location as backup
        setTimeout(() => {
            window.location.href = deepLink;
        }, 100);

        // If app doesn't open after 3 seconds, show manual option
        const timer = setTimeout(() => {
            setShowManualLink(true);
        }, 3000);

        // Clean up
        return () => {
            clearTimeout(timer);
            document.body.removeChild(link);
        };
    }, []);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-6 text-center max-w-sm">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#EC1D99] border-r-[#EC1D99] animate-spin"></div>
                    <img
                        src="/weeve-logo.png"
                        alt="Weeve"
                        className="w-16 h-16 rounded-xl"
                    />
                </div>

                <div className="text-white">
                    <h1 className="text-2xl font-bold mb-2">🎉 Payment Successful!</h1>
                    <p className="text-gray-400 text-sm mb-4">Your brand story is now live</p>

                    {!showManualLink ? (
                        <p className="text-gray-500 text-xs">Opening Weeve app...</p>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-gray-400 text-sm">Tap below to return to the app</p>
                            <a
                                href="com.weeve.app://payment-success"
                                className="inline-block px-8 py-3 bg-[#EC1D99] text-white font-bold rounded-full hover:bg-[#d91a89] transition-colors"
                            >
                                Open Weeve
                            </a>
                            <p className="text-gray-600 text-xs mt-4">
                                Or open the Weeve app manually to see your story
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
