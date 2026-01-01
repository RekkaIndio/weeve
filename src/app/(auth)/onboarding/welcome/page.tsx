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
        // Update database to advance onboarding step
        if (user) {
            await supabase
                .from('profiles')
                .update({ onboarding_step: 2 })
                .eq('user_id', user.id);

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
        console.log('[WelcomePage] Skip button pressed, user:', user?.id);

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

        // Update database in the background (fire and forget)
        if (user) {
            supabase
                .from('profiles')
                .update({ onboarding_step: null, completed_onboarding: true })
                .eq('user_id', user.id)
                .then(() => console.log('[WelcomePage] Database updated for skip'))
                .catch((err: Error) => console.error('[WelcomePage] Skip db update error:', err));
        }
    };

    return <WelcomeCarousel onComplete={handleComplete} onSkip={handleSkip} />;
}
