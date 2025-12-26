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
                            This Brand Partnership Agreement (“Agreement”) governs the use of the Weeve platform by any brand, organisation, or commercial entity operating a Brand Account on Weeve for marketing, advertising, community engagement, or promotional purposes.
                            <br /><br />
                            By creating or using a Brand Account, you (“Partner”) agree to be bound by this Agreement.
                        </p>
                    </div>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">1. Engagement & Licence</h2>
                        <p className="leading-relaxed">
                            Weeve Inc. (“Weeve” or “Company”) grants Partner a limited, non-exclusive, non-transferable, and revocable licence to access and use the Weeve platform solely to create, manage, and publish content through a Brand Account, subject to this Agreement and Weeve’s Community Guidelines.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">2. Content Standards & Compliance</h2>
                        <p className="leading-relaxed">
                            Partner agrees that all brand-generated content (“Brand Content”) will be lawful, accurate, and not misleading, and will comply with all applicable laws and platform guidelines.<br /><br />
                            Sponsored or promotional content must be clearly disclosed where required by law.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">3. Canon Posts & Seed Posts</h2>
                        <p className="leading-relaxed">
                            Canon Posts are premium, persistent placements subject to fair-use limits and moderation.<br /><br />
                            By publishing a Seed Post, Partner grants users a licence to remix and reinterpret that content within the Weeve platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">4. Intellectual Property</h2>
                        <p className="leading-relaxed">
                            Partner retains ownership of its trademarks and Brand Content. Partner grants Weeve a licence to display and promote such content in connection with the platform.<br /><br />
                            All platform technology, analytics, and data remain the property of Weeve.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">5. Termination</h2>
                        <p className="leading-relaxed">
                            Weeve may suspend or terminate Brand Accounts for violations of this Agreement, non-payment, or conduct that harms the platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">6. Indemnification</h2>
                        <p className="leading-relaxed">
                            Partner agrees to indemnify and hold harmless Weeve Inc. from claims arising from Partner’s content, breach of this Agreement, or violation of third-party rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">7. Paid Subscriptions</h2>
                        <p className="leading-relaxed">
                            Certain features may require payment. Fees are non-refundable except where required by law. Pricing may change with notice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">8. Full Terms Apply</h2>
                        <p className="leading-relaxed">
                            This Agreement is a summary of key terms applicable to Brand Accounts. By continuing to access or use the Weeve platform, Partner confirms that it has read, understood, and agrees to be bound by the full Weeve Brand Partnership Agreement and all applicable platform policies.
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
