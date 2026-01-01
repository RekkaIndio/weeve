"use client";

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronDown, ChevronUp, HelpCircle, Mail, MessageSquare, Shield, User, Camera, Users, Zap } from 'lucide-react'
import Link from 'next/link'

interface FAQItem {
    question: string
    answer: string
}

interface FAQCategory {
    title: string
    icon: React.ReactNode
    items: FAQItem[]
}

const faqCategories: FAQCategory[] = [
    {
        title: "Getting Started",
        icon: <Zap className="w-5 h-5" />,
        items: [
            {
                question: "What is Weeve?",
                answer: "Weeve is a collaborative storytelling platform where you can create, share, and build upon stories with friends and communities. Think of it as social media meets creative collaboration – you can start a story, and others can 'weeve' their own content into it, creating branching narratives and shared experiences."
            },
            {
                question: "How do I create my first story?",
                answer: "Tap the '+' button in the bottom navigation to open the story creator. You can add photos, videos, and text to your story. Choose whether to make it public (anyone can see and contribute) or private (only friends you select). Once you're happy with your content, hit 'Post' to share it!"
            },
            {
                question: "What does 'Weeve' mean?",
                answer: "To 'Weeve' means to add your own content to someone else's story, creating a branching timeline. When you weeve into a story, you're building on that narrative while maintaining a connection to the original. It's like adding a new thread to a tapestry!"
            },
            {
                question: "Is Weeve free to use?",
                answer: "Yes! Weeve is completely free to download and use. We may introduce optional premium features in the future, but the core storytelling experience will always remain free."
            }
        ]
    },
    {
        title: "Account & Profile",
        icon: <User className="w-5 h-5" />,
        items: [
            {
                question: "How do I change my profile picture?",
                answer: "Go to your Profile tab, tap on your current profile picture, and select 'Change Photo'. You can choose from your camera roll or take a new photo. Your new picture will be visible to all users."
            },
            {
                question: "Can I change my username?",
                answer: "Yes! Go to Settings > Edit Profile > Username. Note that usernames must be unique, so if your desired username is taken, you'll need to choose another."
            },
            {
                question: "How do I delete my account?",
                answer: "You can delete your account by going to Settings > Account > Delete Account. Please note this action is permanent and will remove all your stories, comments, and data from our servers."
            },
            {
                question: "I forgot my password. How do I reset it?",
                answer: "On the login screen, tap 'Forgot Password' and enter your email address. We'll send you a link to reset your password. If you don't see the email, check your spam folder."
            }
        ]
    },
    {
        title: "Creating Content",
        icon: <Camera className="w-5 h-5" />,
        items: [
            {
                question: "What types of content can I add to stories?",
                answer: "You can add photos, videos (up to 60 seconds), and text to your stories. You can also add stickers, drawings, and location tags to make your content more engaging."
            },
            {
                question: "Who can see my stories?",
                answer: "It depends on your privacy settings. Public stories can be seen by anyone on Weeve. Private stories are only visible to friends you specifically select. You can change a story's visibility at any time."
            },
            {
                question: "Can I edit or delete a story after posting?",
                answer: "Yes! Tap on your story and select the menu (three dots). From there you can edit the caption, change privacy settings, or delete the story entirely."
            },
            {
                question: "What happens when someone weeves into my story?",
                answer: "You'll receive a notification when someone adds to your story. Their contribution will appear as a branch in your story's timeline. You can view all branches by tapping on the story and exploring the tree view."
            }
        ]
    },
    {
        title: "Friends & Community",
        icon: <Users className="w-5 h-5" />,
        items: [
            {
                question: "How do I add friends?",
                answer: "You can find friends by searching for their username in the Discover tab, or by sharing your profile link. When you send a friend request, they'll receive a notification and can choose to accept or decline."
            },
            {
                question: "What are Circles?",
                answer: "Circles are groups of friends you can create for sharing specific stories. For example, you might have a 'Close Friends' circle or a 'Family' circle. When you post a private story, you can select which circles can see it."
            },
            {
                question: "How do I join a community?",
                answer: "Browse communities in the Discover tab or search for topics you're interested in. Tap 'Join' on any community page to become a member. Once joined, you'll see community stories in your feed."
            },
            {
                question: "Can I block or report someone?",
                answer: "Yes. Go to the user's profile and tap the menu (three dots). Select 'Block' to prevent them from seeing your content or contacting you, or 'Report' if they're violating our community guidelines."
            }
        ]
    },
    {
        title: "Privacy & Safety",
        icon: <Shield className="w-5 h-5" />,
        items: [
            {
                question: "How is my data protected?",
                answer: "We use industry-standard encryption to protect your data both in transit and at rest. We never sell your personal information to third parties. Read our full Privacy Policy for more details."
            },
            {
                question: "Can I control who contacts me?",
                answer: "Yes! Go to Settings > Privacy to control who can send you friend requests and messages. You can choose from 'Everyone', 'Friends of Friends', or 'No One'."
            },
            {
                question: "How do I report inappropriate content?",
                answer: "Tap the menu (three dots) on any story or comment and select 'Report'. Choose the reason for your report and submit. Our moderation team reviews all reports within 24 hours."
            },
            {
                question: "What content is not allowed on Weeve?",
                answer: "We don't allow content that is illegal, violent, harassing, sexually explicit, or hateful. We also prohibit spam, impersonation, and intellectual property violations. See our Terms of Service for the full list."
            }
        ]
    }
]

function FAQAccordion({ category }: { category: FAQCategory }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <div className="bg-white/5 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center gap-3">
                <span className="text-[#EC1D99]">{category.icon}</span>
                <h2 className="text-xl font-bold text-white">{category.title}</h2>
            </div>
            <div className="divide-y divide-white/10">
                {category.items.map((item, index) => (
                    <div key={index}>
                        <button
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                        >
                            <span className="text-white font-medium pr-4">{item.question}</span>
                            {openIndex === index ? (
                                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            )}
                        </button>
                        {openIndex === index && (
                            <div className="px-6 pb-4">
                                <p className="text-gray-300 leading-relaxed">{item.answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function HelpPage() {
    const router = useRouter()

    return (
        <main className="min-h-screen bg-black text-gray-200 p-8 md:p-16 font-sans">
            <div className="max-w-3xl mx-auto relative">
                <button
                    onClick={() => router.back()}
                    className="fixed top-8 right-8 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50 text-white"
                    aria-label="Close"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <HelpCircle className="w-10 h-10 text-[#EC1D99]" />
                    <h1 className="text-4xl font-bold text-white">Help & Support</h1>
                </div>
                <p className="text-lg text-gray-400 mb-12">
                    Find answers to common questions or get in touch with our support team.
                </p>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-4 mb-12">
                    <Link
                        href="/contact"
                        className="flex items-center gap-4 p-6 bg-gradient-to-r from-[#EC1D99]/20 to-purple-500/20 border border-[#EC1D99]/30 rounded-2xl hover:border-[#EC1D99]/50 transition-colors"
                    >
                        <MessageSquare className="w-8 h-8 text-[#EC1D99]" />
                        <div>
                            <h3 className="text-white font-bold">Contact Support</h3>
                            <p className="text-sm text-gray-400">Get help from our team</p>
                        </div>
                    </Link>
                    <a
                        href="mailto:support@tryweeve.com"
                        className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/30 transition-colors"
                    >
                        <Mail className="w-8 h-8 text-[#EC1D99]" />
                        <div>
                            <h3 className="text-white font-bold">Email Us</h3>
                            <p className="text-sm text-gray-400">support@tryweeve.com</p>
                        </div>
                    </a>
                </div>

                {/* FAQ Categories */}
                <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    {faqCategories.map((category, index) => (
                        <FAQAccordion key={index} category={category} />
                    ))}
                </div>

                {/* Still Need Help */}
                <div className="mt-12 p-8 bg-white/5 rounded-2xl text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Still need help?</h3>
                    <p className="text-gray-400 mb-6">
                        Can't find what you're looking for? Our support team is here to help.
                    </p>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#EC1D99] to-purple-600 text-white font-bold rounded-lg hover:from-[#d4178a] hover:to-purple-700 transition-all"
                    >
                        <MessageSquare className="w-5 h-5" />
                        Contact Support
                    </Link>
                </div>

                <div className="mt-16 pt-8 border-t border-white/10 text-center">
                    <button
                        onClick={() => router.back()}
                        className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Close and Return
                    </button>
                </div>
            </div>
        </main>
    )
}
