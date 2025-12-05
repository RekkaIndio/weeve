"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, HelpCircle, MessageCircle, FileText, Lock, Users, Zap } from "lucide-react";

interface HelpTopic {
    id: string;
    title: string;
    icon: any;
    description: string;
}

interface FAQ {
    question: string;
    answer: string;
}

const helpTopics: HelpTopic[] = [
    {
        id: "getting-started",
        title: "Getting Started",
        icon: Zap,
        description: "Learn the basics of Weeve",
    },
    {
        id: "stories",
        title: "Stories & Weeves",
        icon: FileText,
        description: "Creating and collaborating on stories",
    },
    {
        id: "privacy",
        title: "Privacy & Safety",
        icon: Lock,
        description: "Your privacy and account security",
    },
    {
        id: "community",
        title: "Community",
        icon: Users,
        description: "Friends, groups, and social features",
    },
];

const faqsByTopic: Record<string, FAQ[]> = {
    "getting-started": [
        {
            question: "What is Weeve?",
            answer: "Weeve is a collaborative storytelling platform where you and your friends create stories together. Each person adds their part to build an amazing shared narrative!",
        },
        {
            question: "How do I create my first story?",
            answer: "Tap the '+' button on the home screen, choose 'Create Story', add a title and description, invite friends, and start weaving your story together!",
        },
        {
            question: "What are Tokens?",
            answer: "Tokens are Weeve's virtual currency. You can use them to join premium stories, unlock special features, or collaborate with influencers. You start with 100 free tokens!",
        },
    ],
    "stories": [
        {
            question: "How do story turns work?",
            answer: "Stories can be turn-based where participants take turns adding content, or open where anyone can contribute at any time. The story creator sets the mode when creating the story.",
        },
        {
            question: "What types of content can I add?",
            answer: "You can add videos, photos, text, or drawings to stories. Mix and match different content types to create engaging narratives!",
        },
        {
            question: "Can I leave a story after joining?",
            answer: "Yes, you can leave any story you're participating in. The creator will be notified and can invite someone else to take your place.",
        },
        {
            question: "How do I save or share a story?",
            answer: "Tap the bookmark icon to save a story to your collection. Use the share button to send the story link to friends or post it on other platforms.",
        },
    ],
    "privacy": [
        {
            question: "Who can see my stories?",
            answer: "You control who sees your stories! Make them public for everyone, or private for invited participants only. You can change this setting when creating a story.",
        },
        {
            question: "How do I make my profile private?",
            answer: "Go to Settings > Privacy > Account Privacy and toggle it on. When private, only approved friends can see your profile and stories.",
        },
        {
            question: "How do I block someone?",
            answer: "Visit their profile, tap the menu icon (⋮), and select 'Block User'. Blocked users can't see your content or interact with you.",
        },
        {
            question: "Can I delete my account?",
            answer: "Yes, go to Settings > Account > Delete Account. Note that this action is permanent and cannot be undone.",
        },
    ],
    "community": [
        {
            question: "How do I add friends?",
            answer: "Search for users by name, share your invite code, or scan someone's QR code. You can also connect with people through shared stories and groups.",
        },
        {
            question: "What are Groups?",
            answer: "Groups are communities centered around shared interests. Join groups to discover stories, meet people with similar interests, and collaborate on group projects.",
        },
        {
            question: "How do notifications work?",
            answer: "You'll receive notifications when it's your turn in a story, when someone invites you, likes or comments on your story, or when you receive friend requests.",
        },
    ],
};

export default function HelpCenterPage() {
    const router = useRouter();
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

    const handleTopicClick = (topicId: string) => {
        setSelectedTopic(topicId);
        setExpandedFAQ(null);
    };

    const toggleFAQ = (question: string) => {
        setExpandedFAQ(expandedFAQ === question ? null : question);
    };

    return (
        <div className="min-h-screen bg-black text-white pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 flex items-center gap-4 border-b border-gray-800">
                <button
                    onClick={() => {
                        if (selectedTopic) {
                            setSelectedTopic(null);
                        } else {
                            router.back();
                        }
                    }}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">
                    {selectedTopic 
                        ? helpTopics.find(t => t.id === selectedTopic)?.title
                        : "Help Center"}
                </h1>
            </div>

            <div className="p-4">
                {!selectedTopic ? (
                    /* Topics List */
                    <>
                        {/* Welcome Section */}
                        <div className="bg-gradient-to-br from-[#EC1D99]/20 to-purple-600/20 border border-[#EC1D99]/30 rounded-lg p-6 mb-6">
                            <HelpCircle className="w-12 h-12 text-[#EC1D99] mb-3" />
                            <h2 className="font-bold text-xl mb-2">How can we help you?</h2>
                            <p className="text-sm text-gray-300">
                                Find answers to common questions or contact our support team
                            </p>
                        </div>

                        {/* Help Topics */}
                        <div className="space-y-3 mb-6">
                            {helpTopics.map((topic) => {
                                const Icon = topic.icon;
                                return (
                                    <button
                                        key={topic.id}
                                        onClick={() => handleTopicClick(topic.id)}
                                        className="w-full bg-gray-900 rounded-lg p-4 flex items-center justify-between hover:bg-gray-800 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-full bg-gray-800 group-hover:bg-[#EC1D99]/20 transition-colors">
                                                <Icon className="w-6 h-6 text-[#EC1D99]" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-semibold">{topic.title}</h3>
                                                <p className="text-xs text-gray-500">{topic.description}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Contact Support */}
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
                            <MessageCircle className="w-10 h-10 text-[#EC1D99] mx-auto mb-3" />
                            <h3 className="font-bold text-lg mb-2">Still need help?</h3>
                            <p className="text-sm text-gray-400 mb-4">
                                Our support team is here to assist you
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => router.push('/settings/report-problem')}
                                    className="w-full bg-[#EC1D99] hover:bg-[#EC1D99]/90 text-white font-bold px-6 py-3 rounded-lg transition-colors"
                                >
                                    Contact Support
                                </button>
                                <p className="text-xs text-gray-500">
                                    Or email us at{' '}
                                    <a 
                                        href="mailto:hello@tryweeve.com" 
                                        className="text-[#EC1D99] hover:underline"
                                    >
                                        hello@tryweeve.com
                                    </a>
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    /* FAQ List for Selected Topic */
                    <div className="space-y-3">
                        {faqsByTopic[selectedTopic]?.map((faq, index) => (
                            <div
                                key={index}
                                className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800"
                            >
                                <button
                                    onClick={() => toggleFAQ(faq.question)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-800 transition-colors text-left"
                                >
                                    <h3 className="font-semibold pr-4">{faq.question}</h3>
                                    <ChevronRight
                                        className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                                            expandedFAQ === faq.question ? 'rotate-90' : ''
                                        }`}
                                    />
                                </button>
                                {expandedFAQ === faq.question && (
                                    <div className="px-4 pb-4 text-sm text-gray-400 border-t border-gray-800 pt-4">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
