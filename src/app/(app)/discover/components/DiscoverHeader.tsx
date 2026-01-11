import Link from "next/link";
import { Search } from "lucide-react";
import NotificationBell from "@/app/components/NotificationBell";

interface DiscoverHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    currentUser: any; // Ideally more specific type
}

export default function DiscoverHeader({ searchQuery, setSearchQuery, currentUser }: DiscoverHeaderProps) {
    return (
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md py-4 px-4 mb-2">
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search stories, people, tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-full py-2 pl-10 pr-4 text-base focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99]/30 transition-all"
                    />
                </div>
                {currentUser && (
                    <NotificationBell
                        userId={currentUser.id}
                        className="bg-gray-900/80 border border-gray-800"
                        badgeClassName="bg-[#EC1D99]"
                    />
                )}
            </div>
        </div>
    );
}
