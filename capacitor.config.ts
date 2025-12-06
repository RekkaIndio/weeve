import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Development bundle id changed to personal dev id so Xcode can auto-provision
  appId: 'com.weeve.app',
  appName: 'Weeve',
  webDir: 'public',
  server: {
    url: 'http://192.168.0.185:3000',
    cleartext: true
  },
  // Deep linking configuration
  ios: {
    scheme: 'weeve',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '127490580268-lg2ohjpnff7abflq1642pjd6dd6hgfkc.apps.googleusercontent.com',
      androidClientId: '127490580268-vho395dvfsrhch5ustj8b6rmsj4lbesu.apps.googleusercontent.com',
      // TODO: Add your iOS Client ID from Google Cloud Console
      // This is required for Google Sign-In to work on iOS devices
      // iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
