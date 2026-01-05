import Link from "next/link";
import MediaWithFallback from "@/app/components/MediaWithFallback";
import { Friend as FriendType } from '@/lib/friends';

interface PeopleSearchResultsProps {
    searchQuery: string;
    peopleResults: FriendType[];
}

export default function PeopleSearchResults({ searchQuery, peopleResults }: PeopleSearchResultsProps) {
    if (!searchQuery.trim() || peopleResults.length === 0) return null;

    return (
        <div className="mb-4 grid grid-cols-1 gap-3 col-span-2">
            <h3 className="text-sm font-bold">{`People matching "${searchQuery}"`}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
                {peopleResults.slice(0, 8).map(person => (
                    <Link key={person.id} href={`/profile/${person.id}`} className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-2 rounded-full hover:border-[#EC1D99]/50 transition-colors">
                        <MediaWithFallback src={person.avatar} alt={person.name} className="w-6 h-6 rounded-full" />
                        <span className="text-xs">{person.name.split(' ').slice(0, 2).join(' ')}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
