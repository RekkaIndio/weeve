# Mobile App Setup Guide

Your Next.js app is now configured to run as a native mobile app using **Capacitor**.

## 🚀 Quick Start

### 1. Ensure your Dev Server is Running
The mobile app is currently configured to load your local computer's server.
**You must keep this command running:**
```bash
npm run dev -- -H 0.0.0.0
```

### 2. Run on Android
**Prerequisite**: Download & Install [Android Studio](https://developer.android.com/studio).

1.  Open the Android project:
    ```bash
    npx cap open android
    ```
2.  Wait for Android Studio to load (Gradle sync).
3.  Click the **Run** (▶️) button in the toolbar to launch the emulator or a connected device.

### 3. Run on iOS (Mac Only)
**Prerequisite**: Download [Xcode](https://apps.apple.com/us/app/xcode/id497799835) from the App Store.

1.  Install CocoaPods (if you haven't):
    ```bash
    sudo gem install cocoapods
    ```
2.  Open the iOS project:
    ```bash
    npx cap open ios
    ```
3.  In Xcode, select a simulator (e.g., iPhone 15) and click the **Run** (▶️) button.

---

## ⚙️ Configuration

### Changing the Server URL
Currently, the app points to `http://192.168.0.185:3000`.
If your IP changes or you want to point to a production URL (e.g., `https://your-app.com`), edit `capacitor.config.ts`:

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  // ...
  server: {
    url: 'https://your-production-url.com', // <--- Update this
    cleartext: true // Set to false for https
  }
};
```

### Syncing Changes
If you install new npm packages or change assets in `public/`, run:
```bash
npx cap sync
```
