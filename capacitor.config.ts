import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Development bundle id changed to personal dev id so Xcode can auto-provision
  appId: 'com.jay.weeve.app',
  appName: 'Weeve',
  webDir: 'public',
  server: {
    url: 'http://192.168.0.185:3000',
    cleartext: true
  }
};

export default config;
