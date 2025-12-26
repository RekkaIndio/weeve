"use client";

import React from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function TermsPage() {
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

                <h1 className="text-4xl font-bold text-white mb-4">Weeve Terms of Service</h1>
                <p className="text-sm text-gray-400 mb-12">Last updated: December 26, 2025</p>

                <div className="space-y-8">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
                        <p className="leading-relaxed">
                            By creating an account, accessing, or using Weeve ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. Weeve is a platform provided by Weeve Inc.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">2. User Accounts</h2>
                        <p className="leading-relaxed">
                            <strong>Eligibility:</strong> You must be at least 16 years old to use the Service. By creating an account, you represent and warrant that you meet this requirement.<br /><br />
                            <strong>Security:</strong> You are responsible for safeguarding your account login credentials. You agree that you are solely responsible for any activity that occurs under your account, whether or not you have authorized that activity.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">3. Content and Conduct</h2>
                        <p className="leading-relaxed">
                            <strong>Your Content:</strong> You retain ownership of the photos, videos, and other content ("User Content") you share on Weeve. However, by posting User Content, you grant Weeve a non-exclusive, royalty-free, transferable, sublicensable, worldwide license to use, store, display, reproduce, modify, create derivative works, perform, and distribute your User Content on the Service.<br /><br />
                            <strong>Prohibited Content:</strong> You may not post content that:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                            <li>Is illegal, violent, or sexually explicit.</li>
                            <li>Harasses, bullies, or intimidates others.</li>
                            <li>Impersonates any person or entity.</li>
                            <li>Infringes on the intellectual property or privacy rights of others.</li>
                            <li>Contains spam, malware, or unauthorized commercial communications.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">4. Brand & Commercial Use</h2>
                        <p className="leading-relaxed">
                            If you are using the Service on behalf of a business or brand, you are also subject to our Partnership Agreement. You represent that you have the authority to bind that entity to these Terms. Business accounts may not use the Service to spam users or engage in deceptive marketing practices.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">5. Termination</h2>
                        <p className="leading-relaxed">
                            We reserve the right to suspend or permanently disable your access to the Service at our sole discretion, with or without notice, if we believe you have violated these Terms or for any other reason.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">6. Disclaimers & Limitation of Liability</h2>
                        <p className="leading-relaxed">
                            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". TO THE MAXIMUM EXTENT PERMITTED BY LAW, WEEVE DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS OR IMPLIED. WEEVE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES RESULTING FROM YOUR USE OF THE SERVICE.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">7. Changes to Terms</h2>
                        <p className="leading-relaxed">
                            We may modify these Terms at any time. We will provide notice of material changes. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">8. Contact Us</h2>
                        <p className="leading-relaxed">
                            If you have any questions about these Terms, please contact us at <a href="mailto:legal@tryweeve.com" className="text-[#EC1D99] hover:underline">legal@tryweeve.com</a>.
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
