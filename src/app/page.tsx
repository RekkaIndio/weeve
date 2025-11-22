"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import FeedItem from "./components/FeedItem";
import { useAuth } from "./components/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { stories } = useStore();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

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
    <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
      {stories.map((story) => (
        <FeedItem key={story.id} story={story} />
      ))}

      {/* End of Feed Placeholder */}
      <div className="h-[calc(100vh-80px)] snap-start flex items-center justify-center bg-black text-gray-500">
        <div className="text-center">
          <p className="mb-4">You&apos;re all caught up!</p>
          <button className="text-[#EC1D99] font-bold">Discover more</button>
        </div>
      </div>
    </div>
  );
}
