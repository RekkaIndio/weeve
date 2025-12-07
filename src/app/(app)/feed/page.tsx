"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import FeedItem from "@/app/components/FeedItem";
import FeedOnboardingOverlay from "@/app/components/FeedOnboardingOverlay";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { stories, fetchStories, currentUser } = useStore();
  const [showOnboardingOverlay, setShowOnboardingOverlay] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (user) {
      fetchStories();
    }
  }, [loading, router, user, fetchStories]);

  // Check if user needs onboarding tutorial
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!currentUser?.id) return;

      try {
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_step, completed_onboarding')
          .eq('user_id', currentUser.id)
          .single();

        // Show overlay if they just created their onboarding story
        if (data && data.onboarding_step === 2 && !data.completed_onboarding) {
          setShowOnboardingOverlay(true);
        }
      } catch (err) {
        console.error('[Feed] Error checking onboarding:', err);
      }
    };

    checkOnboarding();
  }, [currentUser?.id]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#EC1D99] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {stories.map((story) => (
          <FeedItem key={story.id} story={story} />
        ))}

        {/* End of Feed Placeholder */}
        <div className="h-[calc(100vh-64px)] snap-start flex items-center justify-center bg-black text-gray-500">
          <div className="text-center">
            <p className="mb-4">You&apos;re all caught up!</p>
            <button className="text-[#EC1D99] font-bold">Discover more</button>
          </div>
        </div>
      </div>

      {/* Onboarding Tutorial Overlay */}
      {showOnboardingOverlay && (
        <FeedOnboardingOverlay onDismiss={() => setShowOnboardingOverlay(false)} />
      )}
    </>
  );
}
