import React from 'react'

export const metadata = {
  title: 'Privacy Policy',
  description: 'Weeve privacy policy',
}

export default function PrivacyPage() {
  return (
    <main style={{padding:32,fontFamily:'Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial'}}>
      <h1>Weeve Privacy Policy</h1>
      <p>Last updated: December 14, 2025</p>

      <h2>Overview</h2>
      <p>Weeve ("tryweeve.com") provides a social sharing platform for short stories, communities, and media. This Privacy Policy explains what information we collect, why we collect it, and how it is used.</p>

      <h2>Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email address, username, profile information.</li>
        <li><strong>Content:</strong> stories, images, and videos you upload or create with the app.</li>
      </ul>

      <h2>Camera and microphone</h2>
      <p>Weeve only requests access to your camera and microphone when you explicitly choose to create or record content that requires them. If you grant permission, the recorded media is stored and handled according to this policy.</p>
      <p>For Play Console compliance: this app requests the following permissions when required by features in-app: <code>android.permission.CAMERA</code> and <code>android.permission.RECORD_AUDIO</code>. You can revoke these permissions in your device settings. We do not share your recorded media with third parties without your consent except as described below.</p>

      <h2>How we use data</h2>
      <p>We use data to deliver core features, to troubleshoot, and to improve the product. We may share aggregated, non-identifiable analytics with service providers.</p>

      <h2>Contact</h2>
      <p>If you have questions, email <a href="mailto:privacy@tryweeve.com">privacy@tryweeve.com</a>.</p>

      <p>We may update this policy from time to time; the date at the top will change when we do.</p>
    </main>
  )
}