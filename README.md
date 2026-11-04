Weeve

Weeve is a collaborative storytelling app. Someone starts a story, either by inviting friends or by opening it to everyone, and participants take turns adding to it with text, audio, drawings and video. Stories can be forked, put on a turn timer, shared into groups, and, for eligible creators and brands, monetised.

The web app lives at tryweeve.com. The iOS and Android apps are Capacitor shells around the same Next.js codebase.

Features
Story creation: invite-only or open stories, with title, description and participant limits
Multimedia contributions: text, audio recording, drawing canvas and video, with in-browser video stitching and export
Turn timers: optional per-turn time limits (6 to 48 hours) that pass the turn on automatically when they expire
Forking: branch any story into a new one and keep the lineage visible
Social layer: follows, friends, likes, comments, hashtags, profanity filtering, blocking and reporting
Groups and communities: group pages, join requests, group chat and direct messaging
Discovery: interest-based onboarding, a ranked feed and search
Verification: merit-based Bronze, Silver and Gold badges earned through contribution, not purchased
Monetisation: a token economy with creator earnings, payouts and a monetisation eligibility check
Brand accounts: brand sign-up, content approval, pricing and subscription payments
Referrals and deep links: invite codes that connect new users as friends and route mobile visitors into the native app
Notifications: in-app and push (Firebase Cloud Messaging)
Admin console: user, story, group, community and report management under /admin


Tech stack
Layer	Technology
Framework	Next.js 16 (App Router), React 19, TypeScript
Styling	Tailwind CSS 4, Framer Motion
State	Zustand
Backend and database	Supabase (Postgres, Auth, Row Level Security, Edge Functions)
Push and crash reporting	Firebase (Cloud Messaging, Crashlytics)
Mobile	Capacitor 7 (iOS and Android)
Payments	PayPal, Square, Revolut
Email	SendGrid
Testing	Vitest, Testing Library
Hosting	Vercel
