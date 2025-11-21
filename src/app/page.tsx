"use client";

import { useStore } from "@/lib/store";
import FeedItem from "./components/FeedItem";

export default function Home() {
  const { stories } = useStore();

  return (
    <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
      {stories.map((story) => (
        <FeedItem key={story.id} story={story} />
      ))}

      {/* End of Feed Placeholder */}
      <div className="h-[calc(100vh-80px)] snap-start flex items-center justify-center bg-black text-gray-500">
        <div className="text-center">
          <p className="mb-4">You're all caught up!</p>
          <button className="text-[#EC1D99] font-bold">Discover more</button>
        </div>
      </div>
    </div>
  );
}
