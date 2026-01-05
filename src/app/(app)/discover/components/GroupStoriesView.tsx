import Link from "next/link";
import { Plus, Users, GitBranch } from "lucide-react";
import MediaWithFallback from "@/app/components/MediaWithFallback";
import VerificationBadge from "@/app/components/VerificationBadge";
import { Group, Story } from "@/lib/store";

interface GroupStoriesViewProps {
    groupStories: Story[];
    groups: Group[];
    userGroupIds: Set<string>;
    searchQuery: string;
    currentUser: any;
    openStoryInOverlay: (id: string) => void;
    setShowCreateGroup: (show: boolean) => void;
}

export default function GroupStoriesView({
    groupStories,
    groups,
    userGroupIds,
    searchQuery,
    currentUser,
    openStoryInOverlay,
    setShowCreateGroup
}: GroupStoriesViewProps) {
    return (
        <div className="space-y-4 px-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Group Stories</h2>
                <button
                    onClick={() => setShowCreateGroup(true)}
                    className="flex items-center gap-1 text-sm bg-[#EC1D99] px-3 py-1.5 rounded-full hover:bg-[#d61a88] transition-colors shadow-lg shadow-[#EC1D99]/20"
                >
                    <Plus className="w-4 h-4" />
                    Create Group
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {groupStories.length > 0 ? (
                    groupStories.map((story, idx) => {
                        const group = groups.find(g => g.id === story.groupId);
                        return (
                            <div
                                key={story.id}
                                onClick={() => openStoryInOverlay(story.id)}
                                className={`relative rounded-xl overflow-hidden group/card cursor-pointer ${idx % 3 === 0 ? 'row-span-2 aspect-[9/16]' : 'aspect-square'}`}
                            >
                                <MediaWithFallback
                                    src={story.coverImage || story.contributions[0]?.mediaUrl}
                                    alt={story.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                                />
                                {story.forkedFromStoryId && (
                                    <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                        <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                    {group && (
                                        <div className="flex items-center gap-1.5 mb-2 bg-black/40 backdrop-blur-sm p-1.5 rounded-full w-fit max-w-[90%]">
                                            <MediaWithFallback
                                                src={group.avatar}
                                                alt={group.name}
                                                className="w-4 h-4 rounded-full border border-white/20"
                                            />
                                            <span className="text-[10px] font-medium text-white/90 truncate">{group.name}</span>
                                        </div>
                                    )}
                                    <h3 className="font-bold text-sm line-clamp-2 mb-1">{story.title}</h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-300">
                                        <Users className="w-3 h-3" />
                                        <span>{story.participants.length}</span>
                                    </div>
                                </div>
                                <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover/card:ring-[#EC1D99]/50 group-hover/card:shadow-lg group-hover/card:shadow-[#EC1D99]/20 transition-all duration-300" />
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-2 space-y-6">
                        {groupStories.length === 0 && (
                            <>
                                {/* Your Groups Section */}
                                {currentUser && groups.some(g => userGroupIds.has(g.id)) && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-gray-400">Your Groups</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {groups
                                                .filter(g => userGroupIds.has(g.id) && g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                                .slice(0, 4)
                                                .map(group => (
                                                    <Link
                                                        key={group.id}
                                                        href={`/groups/${group.id}`}
                                                        className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col items-center text-center gap-2 hover:border-[#EC1D99]/50 hover:shadow-lg hover:shadow-[#EC1D99]/5 transition-all"
                                                    >
                                                        <MediaWithFallback
                                                            src={group.avatar}
                                                            alt={group.name}
                                                            className="w-12 h-12 rounded-full bg-gray-800 ring-2 ring-gray-800"
                                                        />
                                                        <div>
                                                            <div className="flex items-center gap-1">
                                                                <h4 className="font-bold text-sm line-clamp-1">{group.name}</h4>
                                                                {group.ownerIsVerified && (
                                                                    <VerificationBadge isVerified={true} tier={group.ownerVerificationTier} size="sm" />
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-gray-500">{group.memberCount} members</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Public Groups */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-400">Discover Groups</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {groups
                                            .filter(g => !g.isPrivate && (!currentUser || !userGroupIds.has(g.id)) && g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .sort((a, b) => b.memberCount - a.memberCount)
                                            .slice(0, 10)
                                            .map(group => (
                                                <Link
                                                    key={group.id}
                                                    href={`/groups/${group.id}`}
                                                    className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col items-center text-center gap-2 hover:border-[#EC1D99]/50 hover:shadow-lg hover:shadow-[#EC1D99]/5 transition-all"
                                                >
                                                    <MediaWithFallback
                                                        src={group.avatar}
                                                        alt={group.name}
                                                        className="w-12 h-12 rounded-full bg-gray-800 ring-2 ring-gray-800"
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-1">
                                                            <h4 className="font-bold text-sm line-clamp-1">{group.name}</h4>
                                                            {group.ownerIsVerified && (
                                                                <VerificationBadge isVerified={true} tier={group.ownerVerificationTier} size="sm" />
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-500">{group.memberCount} members</p>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-[#EC1D99] bg-[#EC1D99]/10 border border-[#EC1D99]/20 px-2 py-0.5 rounded-full mt-1">
                                                        Join
                                                    </span>
                                                </Link>
                                            ))}
                                    </div>
                                    {groups.filter(g => !g.isPrivate && g.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500 text-sm">No groups found.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="text-center pt-4">
                                    <p className="text-gray-400 text-sm mb-2">Can't find what you're looking for?</p>
                                    <button
                                        onClick={() => setShowCreateGroup(true)}
                                        className="text-[#EC1D99] text-sm font-medium hover:underline"
                                    >
                                        Start your own group →
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
