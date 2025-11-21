import React from 'react';
import { Sparkles, Camera, Utensils, Plane, Music } from 'lucide-react';

export interface Template {
    id: string;
    name: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    mode: 'invite' | 'open';
    inviteCount?: number;
    maxWeeves?: string;
    hashtags: string[];
}

const TEMPLATES: Template[] = [
    {
        id: 'daily-vlog',
        name: 'Daily Vlog',
        icon: <Camera className="w-5 h-5" />,
        title: 'My Day in 60 Seconds',
        description: 'A quick recap of my day! 📸',
        mode: 'open',
        maxWeeves: '10',
        hashtags: ['dailyvlog', 'mylife'],
    },
    {
        id: 'travel-diary',
        name: 'Travel Diary',
        icon: <Plane className="w-5 h-5" />,
        title: 'Travel Adventures',
        description: 'Exploring new places and faces! ✈️',
        mode: 'invite',
        inviteCount: 3,
        hashtags: ['travel', 'adventure'],
    },
    {
        id: 'foodie',
        name: 'Foodie Tour',
        icon: <Utensils className="w-5 h-5" />,
        title: 'Foodie Finds',
        description: 'The best eats in town! 🍔',
        mode: 'open',
        maxWeeves: '10',
        hashtags: ['foodie', 'yummy'],
    },
    {
        id: 'jam-session',
        name: 'Jam Session',
        icon: <Music className="w-5 h-5" />,
        title: 'Virtual Jam',
        description: 'Making music together! 🎸',
        mode: 'invite',
        inviteCount: 4,
        hashtags: ['music', 'jam'],
    },
];

interface StoryTemplatesProps {
    onSelect: (template: Template) => void;
}

export default function StoryTemplates({ onSelect }: StoryTemplatesProps) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#EC1D99]" />
                <h3 className="text-sm font-medium text-gray-300 font-sans">
                    Start with a Template
                </h3>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                {TEMPLATES.map((template) => (
                    <button
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="flex flex-col items-center gap-2 min-w-[100px] p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-[#EC1D99] hover:bg-gray-800 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-[#EC1D99]/20 group-hover:text-[#EC1D99] transition-colors">
                            {template.icon}
                        </div>
                        <span className="text-xs font-medium text-gray-300 group-hover:text-white text-center font-sans">
                            {template.name}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
