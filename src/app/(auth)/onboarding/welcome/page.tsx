"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import WelcomeCarousel from "@/app/components/WelcomeCarousel";

export default function WelcomePage() {
    const router = useRouter();
    const { user } = useAuth();

    const handleComplete = () => {
        router.push("/onboarding/follows");
    };

    const handleSkip = () => {
        // Skip directly to follows page
        router.push("/onboarding/follows");
    };

    return <WelcomeCarousel onComplete={handleComplete} onSkip={handleSkip} />;
}
