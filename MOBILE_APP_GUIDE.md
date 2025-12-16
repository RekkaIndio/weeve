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

### Server URL (dev vs production)
By default in development you may point the app at your computer's dev server. Do NOT ship that value to production — Play Store users will see a WebView error like `ERR_CONNECTION_REFUSED` when that dev server is unreachable.

- For development only: set the server URL at build time with env vars so it is opt-in:

```bash
CAPACITOR_SERVER_URL="http://192.168.0.185:3000" CAPACITOR_SERVER_CLEARTEXT=true npx cap sync android
```

- For production/release: the recommended approach is to leave `CAPACITOR_SERVER_URL` unset so the app loads the bundled `webDir` assets from the APK/AAB.

  If you instead want the installed app to load the remote production web app, set `CAPACITOR_SERVER_URL` to `https://tryweeve.com` and `CAPACITOR_SERVER_CLEARTEXT=false` when building and syncing before producing a release bundle. Example:

  ```bash
  # Option A: bundled assets (recommended)
  npm run build
  npx cap sync android
  cd android && ./gradlew bundleRelease

  # Option B: point release at https://tryweeve.com (if intentional)
  CAPACITOR_SERVER_URL="https://tryweeve.com" CAPACITOR_SERVER_CLEARTEXT=false npm run build
  npx cap sync android
  cd android && ./gradlew bundleRelease
  ```

If you accidentally published an APK/AAB that points at your local dev server, remove the `server.url` (or unset the env var), rebuild the release, and submit an update to the Play Store.
### Syncing Changes
If you install new npm packages or change assets in `public/`, run:
```bash
npx cap sync
```
