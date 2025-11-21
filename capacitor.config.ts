import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.weeve.app',
  appName: 'Weeve',
  webDir: 'public',
  server: {
    url: 'http://192.168.0.185:3000',
    cleartext: true
  }
};

export default config;
