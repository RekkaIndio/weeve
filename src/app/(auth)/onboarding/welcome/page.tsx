"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import WelcomeCarousel from "@/app/components/WelcomeCarousel";

export default function WelcomePage() {
    const router = useRouter();
    const { user } = useAuth();

    const handleComplete = async () => {
        // Update database to advance onboarding step via API (Bypasses RLS)
        if (user) {
            try {
                await fetch('/api/auth/update-onboarding', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        onboardingStep: 2
                    }),
                });
            } catch (err) {
                console.error('[WelcomePage] API Update failed:', err);
            }

            // Update store to prevent race condition with AuthProvider
            const { setCurrentUser, currentUser: storeUser } = useStore.getState();
            if (storeUser) {
                setCurrentUser({
                    ...storeUser,
                    onboardingStep: 2,
                });
            }
        }
        router.push("/onboarding/follows");
    };

    const handleSkip = async () => {
        console.log('[WelcomePage] Skip button pressed');

        // Update store FIRST for immediate state change (prevents redirect back)
        const { setCurrentUser, currentUser: storeUser } = useStore.getState();
        if (storeUser) {
            setCurrentUser({
                ...storeUser,
                completedOnboarding: true,
                onboardingStep: undefined,
            });
        }

        // Set local dismissal flags
        try {
            if (typeof window !== 'undefined' && user?.id) {
                localStorage.setItem('weeve_onboarding_overlay_dismissed_' + user.id, 'true');
                localStorage.setItem('weeve_onboarding_story_overlay_dismissed_' + user.id, 'true');
            }
        } catch (err) {
            console.warn('[WelcomePage] localStorage error:', err);
        }

        // Navigate IMMEDIATELY - don't wait for database
        // Use window.location as fallback to ensure navigation
        try {
            router.push("/feed");
        } catch (e) {
            window.location.href = "/feed";
        }

        // Update database in the background via API (Bypasses RLS)
        if (user) {
            fetch('/api/auth/update-onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    onboardingStep: null,
                    completedOnboarding: true
                }),
            })
                .then(() => console.log('[WelcomePage] Database updated for skip via API'))
                .catch((err: Error) => console.error('[WelcomePage] Skip API update error:', err));
        }
    };

    return <WelcomeCarousel onComplete={handleComplete} onSkip={handleSkip} />;
}
