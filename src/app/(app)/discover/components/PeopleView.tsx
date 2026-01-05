import Link from "next/link";
import { Users } from "lucide-react";
import MediaWithFallback from "@/app/components/MediaWithFallback";
import { Friend as FriendType } from '@/lib/friends';

interface PeopleViewProps {
    peopleResults: FriendType[];
    isSearchingPeople: boolean;
    handleSendFriendRequest: (id: string) => void;
}

export default function PeopleView({
    peopleResults,
    isSearchingPeople,
    handleSendFriendRequest
}: PeopleViewProps) {
    return (
        <div className="space-y-4 px-4">
            <div className="mb-4 grid grid-cols-1 gap-3">
                {isSearchingPeople ? (
                    <div className="flex items-center justify-center py-8 gap-3">
                        <div className="w-5 h-5 border-2 border-[#EC1D99] border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-400">Searching...</span>
                    </div>
                ) : (peopleResults.length > 0 ? (
                    peopleResults.map((person) => (
                        <div key={person.id} className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-[#EC1D99]/50 hover:shadow-lg hover:shadow-[#EC1D99]/5 transition-all duration-200 cursor-pointer">
                            <Link href={`/profile/${person.id}`} className="flex items-center gap-4 flex-1">
                                <MediaWithFallback
                                    src={person.avatar}
                                    alt={person.name}
                                    className="w-12 h-12 rounded-full bg-gray-800 ring-2 ring-gray-800"
                                />
                                <div className="flex-1">
                                    <h3 className="font-bold text-base">{person.name}</h3>
                                    {person.tagline && <p className="text-xs text-gray-400 line-clamp-1">{person.tagline}</p>}
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                        {person.isFriend ? <span className="bg-gray-800 px-1.5 rounded text-[10px]">Friend</span> : null}
                                    </div>
                                </div>
                            </Link>
                            {person.isFriend ? (
                                <div className="text-xs font-medium text-gray-300 border border-gray-700 px-3 py-1 rounded-full">Friends</div>
                            ) : person.friendRequestStatus === 'none' ? (
                                <button onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(person.id); }} className="text-xs font-medium text-[#EC1D99] border border-[#EC1D99] px-3 py-1 rounded-full hover:bg-[#EC1D99] hover:text-white transition-colors">Add Friend</button>
                            ) : person.friendRequestStatus === 'pending_sent' ? (
                                <div className="text-xs font-medium text-[#EC1D99] border border-[#EC1D99]/50 px-3 py-1 rounded-full bg-[#EC1D99]/10">Requested</div>
                            ) : (
                                <div className="text-xs font-medium text-gray-500 border border-gray-700 px-3 py-1 rounded-full">Pending</div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 space-y-3">
                        <Users className="w-12 h-12 text-gray-700 mx-auto" />
                        <p className="text-gray-400">No people found</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
