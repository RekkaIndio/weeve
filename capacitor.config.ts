import type { CapacitorConfig } from '@capacitor/cli';



// Make the dev server opt-in via env var so production builds use bundled assets
// Make the dev server opt-in via env var so production builds use bundled assets
// Default to production URL if not specified
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://www.tryweeve.com';
const server = {
  url: serverUrl,
  cleartext: process.env.CAPACITOR_SERVER_CLEARTEXT === 'true',
  // precise domain needed for deep links to not open in browser
  allowNavigation: [
    'tryweeve.com',
    'www.tryweeve.com',
    '*.tryweeve.com'
  ],
};

const config: CapacitorConfig = {
  // Development bundle id changed to personal dev id so Xcode can auto-provision
  appId: 'com.weeve.app',
  appName: 'Weeve',
  webDir: 'public',
  server,
  // Add a unique string to the User Agent so we can detect the app in middleware
  appendUserAgent: ' WeeveApp',
  // Deep linking configuration
  ios: {
    scheme: 'com.weeve.app',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '127490580268-lg2ohjpnff7abflq1642pjd6dd6hgfkc.apps.googleusercontent.com',
      androidClientId: '127490580268-vho395dvfsrhch5ustj8b6rmsj4lbesu.apps.googleusercontent.com',
      // iOS Client ID from Google Cloud Console (OAuth client for iOS)
      // This is required for Google Sign-In to work on iOS devices
      iosClientId: '127490580268-Inhvj7dh3pou1phmnv1gdvri85i9rrcs.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
