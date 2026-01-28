import React from 'react';
import { Users, Share2, Lock, Globe, BookOpen } from "lucide-react";
import VerificationBadge from '@/app/components/VerificationBadge';
import type { Database } from '@/lib/database.types';

import { formatCount } from '@/lib/format';

// We can extend the GroupRow type or define a specific interface based on what's actually used
// looking at the GroupsPage code, the 'groups' state seems to have some joined/computed fields 
// like memberCount, storyCount, isMember, etc.
// Let's assume the passed 'group' object has these fields.

export interface GroupCardProps {
    group: any; // Using any for now to match the implicit type in page.tsx, broadly matches the Supabase shape + extra fields
    onJoin: (id: string, isPrivate: boolean, name: string) => void;
    onShare: (group: any) => void;
    onClick: (id: string) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, onJoin, onShare, onClick }) => {
    return (
        <div
            onClick={() => onClick(group.id)}
            className="group relative h-full flex flex-col bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-4 hover:border-[#EC1D99]/50 hover:shadow-lg hover:shadow-[#EC1D99]/5 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Hover Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#EC1D99]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex-1 flex gap-4 w-full">
                {/* Avatar Column */}
                <div className="flex-shrink-0 flex flex-col items-center gap-3">
                    <img
                        src={group.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${group.name}`}
                        alt={group.name}
                        className="w-14 h-14 rounded-2xl bg-gray-800 object-cover shadow-lg border border-white/5"
                    />

                    {/* Public/Private Badge - Moved under avatar */}
                    <div className={`flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border w-full text-center ${group.isPrivate
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                        {group.isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                        {group.isPrivate ? 'PRIVATE' : 'PUBLIC'}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start gap-2 w-full">
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <h3 className="font-bold text-lg text-white leading-tight group-hover:text-[#EC1D99] transition-colors truncate w-full" title={group.name}>
                                        {group.name}
                                    </h3>
                                    {group.ownerIsVerified && (
                                        <VerificationBadge
                                            isVerified={true}
                                            tier={group.ownerVerificationTier}
                                            size="sm"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Action Button (Join) */}
                            {!group.isMember && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onJoin(group.id, group.isPrivate, group.name);
                                    }}
                                    className="flex-shrink-0 bg-[#EC1D99] hover:bg-[#d61a88] text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors shadow-lg shadow-[#EC1D99]/20"
                                >
                                    Join
                                </button>
                            )}
                        </div>

                        <p className="text-sm text-gray-400 mt-1 line-clamp-2 leading-relaxed h-10">
                            {group.description || "No description provided."}
                        </p>
                    </div>

                    {/* Footer / Stats */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-[#EC1D99]" />
                                <span>{formatCount(group.memberCount || 0)} Members</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-[#EC1D99]" />
                                <span>{formatCount(group.storyCount || 0)} Stories</span>
                            </div>
                        </div>

                        {/* Share Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onShare(group);
                            }}
                            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
                            aria-label="Share group"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupCard;
