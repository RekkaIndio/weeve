"use client";

import React from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function PrivacyPage() {
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

        <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: December 30, 2025</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
            <p className="leading-relaxed">
              Welcome to Weeve ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website at tryweeve.com (collectively, the "Service").
            </p>
            <p className="leading-relaxed mt-4">
              By accessing or using the Service, you agree to this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.1 Personal Information</h3>
                <p className="leading-relaxed">
                  We may collect personal information that you voluntarily provide when registering for an account, including:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                  <li>Name and username</li>
                  <li>Email address</li>
                  <li>Profile picture and biography</li>
                  <li>Date of birth (for age verification)</li>
                  <li>Phone number (if provided)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.2 User-Generated Content</h3>
                <p className="leading-relaxed">
                  When you create, upload, or share content through the Service, we collect:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                  <li>Stories, photos, videos, and other media files</li>
                  <li>Comments, likes, and other interactions</li>
                  <li>Messages and communications with other users</li>
                  <li>Community and circle memberships</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.3 Device and Usage Information</h3>
                <p className="leading-relaxed">
                  We automatically collect certain information when you access the Service:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                  <li>Device type, operating system, and unique device identifiers</li>
                  <li>IP address and approximate location (city/region level)</li>
                  <li>Browser type and version</li>
                  <li>Usage patterns, including features used and time spent on the Service</li>
                  <li>Crash reports and performance data</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.4 Camera and Microphone Access</h3>
                <p className="leading-relaxed">
                  Weeve requests access to your camera and microphone only when you explicitly choose to create or record content. This includes:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                  <li>Recording video stories</li>
                  <li>Taking photos for your profile or content</li>
                  <li>Adding audio to your stories</li>
                </ul>
                <p className="leading-relaxed mt-2 text-gray-400 text-sm">
                  For mobile app compliance: The app requests <code className="bg-white/10 px-1 rounded">android.permission.CAMERA</code> and <code className="bg-white/10 px-1 rounded">android.permission.RECORD_AUDIO</code> permissions. You can revoke these permissions at any time in your device settings.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
            <p className="leading-relaxed">
              We use the information we collect for various purposes, including:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
              <li>Providing, maintaining, and improving the Service</li>
              <li>Creating and managing your account</li>
              <li>Processing and facilitating content creation and sharing</li>
              <li>Enabling communication between users</li>
              <li>Personalising your experience and content recommendations</li>
              <li>Sending you service-related notifications and updates</li>
              <li>Responding to your inquiries and support requests</li>
              <li>Detecting, preventing, and addressing fraud, abuse, and security issues</li>
              <li>Conducting analytics to understand usage patterns and improve our Service</li>
              <li>Complying with legal obligations and enforcing our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Information Sharing and Disclosure</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">4.1 Public Content</h3>
                <p className="leading-relaxed">
                  Content you post publicly on the Service (such as public stories) may be visible to other users and the general public. Please be mindful of the information you choose to share publicly.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">4.2 Service Providers</h3>
                <p className="leading-relaxed">
                  We may share your information with third-party service providers who perform services on our behalf, including:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                  <li>Cloud hosting and data storage (Supabase, AWS)</li>
                  <li>Email delivery services (Mailgun)</li>
                  <li>Analytics providers</li>
                  <li>Payment processors (for monetisation features)</li>
                </ul>
                <p className="leading-relaxed mt-2">
                  These providers are contractually bound to protect your information and may only use it for the specific purposes for which we engage them.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">4.3 Legal Requirements</h3>
                <p className="leading-relaxed">
                  We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency), or when we believe disclosure is necessary to:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                  <li>Comply with a legal obligation</li>
                  <li>Protect and defend our rights or property</li>
                  <li>Prevent or investigate possible wrongdoing in connection with the Service</li>
                  <li>Protect the personal safety of users or the public</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">4.4 Business Transfers</h3>
                <p className="leading-relaxed">
                  If Weeve is involved in a merger, acquisition, reorganisation, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any change in ownership or use of your personal information.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Security</h2>
            <p className="leading-relaxed">
              We implement appropriate technical and organisational security measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Regular security assessments and vulnerability testing</li>
              <li>Access controls limiting who can access personal data</li>
              <li>Secure authentication mechanisms</li>
            </ul>
            <p className="leading-relaxed mt-4">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Data Retention</h2>
            <p className="leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide you the Service. We may also retain and use your information as necessary to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
              <li>Comply with our legal obligations</li>
              <li>Resolve disputes and enforce our agreements</li>
              <li>Maintain security and prevent fraud</li>
            </ul>
            <p className="leading-relaxed mt-4">
              When you delete your account, we will delete or anonymise your personal information within 30 days, except where retention is required by law or for legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Your Rights and Choices</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">7.1 Access and Portability</h3>
                <p className="leading-relaxed">
                  You have the right to request access to the personal information we hold about you and to receive a copy of your data in a portable format.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">7.2 Correction and Update</h3>
                <p className="leading-relaxed">
                  You may update or correct your account information at any time through your profile settings. If you need assistance, contact us at <a href="mailto:privacy@tryweeve.com" className="text-[#EC1D99] hover:underline">privacy@tryweeve.com</a>.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">7.3 Deletion</h3>
                <p className="leading-relaxed">
                  You may request deletion of your account and personal information. You can do this through the Settings &gt; Delete Account option in the app, or by contacting us directly.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">7.4 Opt-Out of Communications</h3>
                <p className="leading-relaxed">
                  You can opt out of receiving promotional emails by following the unsubscribe instructions in those emails. You may still receive service-related communications necessary for your account.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">7.5 Additional Rights for EEA/UK Residents</h3>
                <p className="leading-relaxed">
                  If you are located in the European Economic Area or United Kingdom, you have additional rights under GDPR, including:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                  <li>The right to object to processing of your personal data</li>
                  <li>The right to restrict processing of your personal data</li>
                  <li>The right to lodge a complaint with a supervisory authority</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">7.6 California Residents (CCPA)</h3>
                <p className="leading-relaxed">
                  If you are a California resident, you have specific rights under the California Consumer Privacy Act, including the right to know what personal information is collected and the right to opt-out of the sale of personal information. We do not sell your personal information.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Cookies and Tracking Technologies</h2>
            <p className="leading-relaxed">
              We use cookies and similar tracking technologies to collect information about your browsing activities. These technologies help us:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
              <li>Remember your preferences and settings</li>
              <li>Understand how you use our Service</li>
              <li>Analyse trends and improve performance</li>
              <li>Deliver relevant content</li>
            </ul>
            <p className="leading-relaxed mt-4">
              You can manage cookie preferences through your browser settings. Note that disabling certain cookies may affect the functionality of our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Third-Party Links and Services</h2>
            <p className="leading-relaxed">
              Our Service may contain links to third-party websites or integrate with third-party services. This Privacy Policy does not apply to those third-party services, and we are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party services you access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Children's Privacy</h2>
            <p className="leading-relaxed">
              The Service is not intended for children under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that we have collected personal information from a child under 16, we will take steps to delete such information promptly.
            </p>
            <p className="leading-relaxed mt-4">
              If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <a href="mailto:legal@tryweeve.com" className="text-[#EC1D99] hover:underline">legal@tryweeve.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. International Data Transfers</h2>
            <p className="leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that are different from the laws of your country.
            </p>
            <p className="leading-relaxed mt-4">
              We take appropriate safeguards to ensure that your personal information remains protected in accordance with this Privacy Policy, including implementing Standard Contractual Clauses approved by the European Commission where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">12. Changes to This Privacy Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top.
            </p>
            <p className="leading-relaxed mt-4">
              We encourage you to review this Privacy Policy periodically for any changes. Your continued use of the Service after any modifications indicates your acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">13. Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-white/5 rounded-lg">
              <p className="text-white font-semibold">Weeve</p>
              <p className="text-gray-300">Email: <a href="mailto:privacy@tryweeve.com" className="text-[#EC1D99] hover:underline">privacy@tryweeve.com</a></p>
              <p className="text-gray-300">Website: <a href="https://tryweeve.com" className="text-[#EC1D99] hover:underline">tryweeve.com</a></p>
            </div>
            <p className="leading-relaxed mt-4">
              We will respond to your inquiry within 30 days.
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