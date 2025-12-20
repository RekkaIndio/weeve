"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import WelcomeCarousel from "@/app/components/WelcomeCarousel";

export default function WelcomePage() {
    const router = useRouter();
    const { user } = useAuth();

    const handleComplete = () => {
        router.push("/onboarding/prompt");
    };

    const handleSkip = () => {
        // Skip directly to prompt page
        router.push("/onboarding/prompt");
    };

    return <WelcomeCarousel onComplete={handleComplete} onSkip={handleSkip} />;
}
