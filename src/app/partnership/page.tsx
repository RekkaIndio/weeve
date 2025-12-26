"use client";

import React from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function PartnershipPage() {
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

                <h1 className="text-4xl font-bold text-white mb-4">Partnership Agreement</h1>
                <p className="text-sm text-gray-400 mb-12">Last updated: December 26, 2025</p>

                <div className="space-y-8">
                    <div className="p-6 bg-white/5 border border-white/10 rounded-lg mb-8">
                        <p className="italic text-gray-300">
                            This Agreement applies to all "Brand Accounts" and commercial partners utilizing the Weeve platform for marketing, community engagement, or advertising purposes.
                        </p>
                    </div>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">1. Engagement</h2>
                        <p className="leading-relaxed">
                            Weeve Inc. ("Company") grants the Brand Partner ("Partner") a limited, non-exclusive right to use the Weeve platform to create and manage a Brand Account, subject to the terms herein. This engagement is for the purpose of community building, content distribution, and user engagement.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">2. Content Standards & Integrity</h2>
                        <p className="leading-relaxed">
                            <strong>Quality Control:</strong> Partner agrees to maintain high standards of quality for all content ("Brand Content") posted to the platform. Content must not be misleading, fraudulent, or deceptive.<br /><br />
                            <strong>Disclosure:</strong> Partner is responsible for complying with all applicable laws regarding advertising disclosure (e.g., FTC guidelines), including clearly labeling sponsored content if applicable used outside of standard native ad formats provided by Weeve.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">3. Canon & Seed Posts</h2>
                        <p className="leading-relaxed">
                            <strong>Canon Posts:</strong> Partner may utilize "Canon Posts" to establish permanent story slots. Partner acknowledges that these slots are a premium feature and subject to fair use limits to prevent feed spamming.<br /><br />
                            <strong>Seed Posts:</strong> Partner may create "Seed Posts" to encourage user remixing and stitching. By creating a Seed Post, Partner explicitly grants users a license to remix, edit, and redistribute the content within the Weeve ecosystem.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">4. Intellectual Property</h2>
                        <p className="leading-relaxed">
                            <strong>Partner IP:</strong> Partner retains all rights to its trademarks, logos, and original content. Partner grants Weeve a license to display such assets in connection with the Partner's presence on the platform.<br /><br />
                            <strong>Platform Data:</strong> Weeve retains all rights to the platform code, design, user data, and analytics. Partner is granted a license to view and use analytics data related to their own account performance for internal business purposes only.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">5. Term & Termination</h2>
                        <p className="leading-relaxed">
                            This Agreement is effective upon creation of a Brand Account and acceptance of these terms. Weeve may terminate this Agreement and the Partner's account at any time for violation of community guidelines, non-payment of fees (if applicable), or content that damages the reputation of the platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">6. Indemnification</h2>
                        <p className="leading-relaxed">
                            Partner agrees to indemnify and hold harmless Weeve Inc. and its officers, directors, and employees from any claims, damages, or expenses arising out of Partner's content, breach of this Agreement, or violation of any third-party rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">7. Paid Subscriptions</h2>
                        <p className="leading-relaxed">
                            Certain features for brands may require a subscription. Fees are non-refundable except as required by law. Weeve reserves the right to modify pricing with 30 days notice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">8. Contact</h2>
                        <p className="leading-relaxed">
                            For partnership support or inquiries regarding this agreement, please contact the Partner Team at <a href="mailto:partners@tryweeve.com" className="text-[#EC1D99] hover:underline">partners@tryweeve.com</a>.
                        </p>
                    </section>
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
