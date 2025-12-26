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
                            By accessing or using the Service, you confirm that you have read, understood, and agree to these Terms and all applicable policies and guidelines.<br /><br />
                            If you are using the Service on behalf of an organisation or business, you represent that you have the authority to bind that entity to these Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">2. User Accounts</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">2.1 Eligibility</h3>
                                <p className="leading-relaxed">
                                    You must be at least 16 years old to use the Service. By creating an account, you represent and warrant that you meet this requirement and that the information you provide is accurate.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">2.2 Account Security</h3>
                                <p className="leading-relaxed">
                                    You are responsible for safeguarding your login credentials and for all activity that occurs under your account, whether authorised by you or not. You agree to notify Weeve immediately of any unauthorised use of your account.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">3. Content and Conduct</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">3.1 Your Content</h3>
                                <p className="leading-relaxed">
                                    You retain ownership of any photos, videos, text, or other content you submit (“User Content”). By posting User Content, you grant Weeve a non-exclusive, royalty-free, transferable, sublicensable, worldwide licence to host, store, display, reproduce, modify, create derivative works from, perform, and distribute such User Content in connection with operating and promoting the Service.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">3.2 Prohibited Content</h3>
                                <p className="leading-relaxed">
                                    You agree not to post, upload, or distribute content that:
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                                    <li>Is unlawful, violent, hateful, or sexually explicit</li>
                                    <li>Harasses, bullies, threatens, or intimidates others</li>
                                    <li>Impersonates any person or entity</li>
                                    <li>Infringes intellectual property, privacy, or publicity rights</li>
                                    <li>Contains spam, malware, or unauthorised commercial communications</li>
                                </ul>
                                <p className="leading-relaxed mt-2">
                                    Weeve reserves the right to remove content or restrict accounts that violate these rules.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">4. Brand & Commercial Use</h2>
                        <p className="leading-relaxed">
                            If you use the Service on behalf of a business or brand, you are also subject to the Weeve Brand Partnership Agreement. You represent that you have authority to bind that entity.<br /><br />
                            Business and brand accounts may not use the Service to spam users, manipulate engagement, or engage in deceptive marketing practices.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">5. Termination</h2>
                        <p className="leading-relaxed">
                            Weeve may suspend or permanently terminate your access to the Service at any time, with or without notice, if you violate these Terms or if your conduct poses a risk to the platform, users, or Weeve.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">6. Disclaimers & Limitation of Liability</h2>
                        <p className="leading-relaxed">
                            THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE”. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WEEVE DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.<br /><br />
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WEEVE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">7. Changes to These Terms</h2>
                        <p className="leading-relaxed">
                            Weeve may modify these Terms from time to time. We will provide notice of material changes where required. Continued use of the Service after changes become effective constitutes acceptance of the revised Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">8. Contact</h2>
                        <p className="leading-relaxed">
                            If you have any questions about these Terms, please contact us at <a href="mailto:legal@tryweeve.com" className="text-[#EC1D99] hover:underline">legal@tryweeve.com</a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">9. Full Terms Apply</h2>
                        <p className="leading-relaxed">
                            This Agreement is a summary of key terms applicable to User Accounts. By continuing to access or use the Weeve platform, User confirms that it has read, understood, and agrees to be bound by the full Weeve terms of service and all applicable platform policies.
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
