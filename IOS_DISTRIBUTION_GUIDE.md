# iOS App Distribution Guide (TestFlight)

To send a test version of your iOS app to a friend, the standard and easiest way is to use **TestFlight**. This requires an Apple Developer Account and using Xcode to upload your build.

## Prerequisites

1.  **Apple Developer Program Enrollment**: You must be enrolled in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
2.  **App Store Connect**: You need access to [App Store Connect](https://appstoreconnect.apple.com/).

## Step 1: Prepare Your App for Production

Before building, ensure your app points to your production server, not your local machine.

1.  **Update `capacitor.config.ts`**:
    *   Remove the `server` block that points to `192.168.x.x`.
    *   Ensure `webDir` is set to `public` (or `out` if you are doing a static export, but for Next.js with Capacitor, usually you sync the `out` or `public` folder).
    *   *Note*: If you are using `next dev`, you can't build for production. You need to perform a static export or have your app hosted and point the capacitor config to the live URL (if not bundling the web assets).
    *   **Recommended**: Bundle the web assets.
        Run:
        ```bash
        npm run build
        npx cap sync
        ```

## Step 2: Configure Signing in Xcode

1.  Open your project in Xcode:
    ```bash
    npx cap open ios
    ```
2.  Click on the **App** project in the left navigator (the blue icon at the top).
3.  Select the **App** target in the main view.
4.  Go to the **Signing & Capabilities** tab.
5.  **Team**: Select your Apple Developer Team. If none is listed, click **Add an Account...** and sign in with your Apple ID.
6.  **Bundle Identifier**: Ensure this is unique (e.g., `com.yourname.weeve`). It must match what you register in App Store Connect.

## Step 3: Create an App Record in App Store Connect

1.  Go to [App Store Connect](https://appstoreconnect.apple.com/).
2.  Click **My Apps** -> **(+)** -> **New App**.
3.  Fill in the details (Name, Language, Bundle ID - select the one from Xcode, SKU).
4.  Click **Create**.

## Step 4: Archive and Upload

1.  In Xcode, select **Any iOS Device (arm64)** from the device selector at the top (where you usually select a Simulator).
2.  Go to **Product** -> **Archive**.
3.  Xcode will build your app. This may take a few minutes.
4.  Once finished, the **Organizer** window will open.
5.  Select your new archive and click **Distribute App**.
6.  Select **TestFlight & App Store** -> **Next**.
7.  Click **Next** through the options (Keep default settings usually works).
8.  Click **Upload**.

## Step 5: Invite Testers in TestFlight

1.  Once the upload completes and processes (you'll get an email from Apple), go back to [App Store Connect](https://appstoreconnect.apple.com/).
2.  Select your app and go to the **TestFlight** tab.
3.  **Internal Testing**:
    *   Click **(+)** next to Internal Testing.
    *   Create a group (e.g., "Team").
    *   Add yourself and your friend (via email).
    *   They will receive an email with a code to install the app via the TestFlight app on their phone.

## Troubleshooting Common Issues

*   **Signing Errors**: Ensure your Bundle ID is unique and your Team is selected in Xcode.
*   **Build Failures**: Make sure you ran `npm run build` and `npx cap sync` before archiving.

## Free Alternative: Direct Install (7-Day Expiry)

If you don't want to pay the $99/year fee, you can install the app directly onto your friend's phone using Xcode.

**Limitations:**
*   **Physical Access**: You need their iPhone physically connected to your Mac (at least for the first install).
*   **7-Day Expiry**: The app will stop working after 7 days. You will need to reinstall it to renew the certificate.
*   **No Remote Updates**: You can't send them updates over the air.

**Steps:**
1.  **Connect Device**: Plug your friend's iPhone into your Mac.
2.  **Trust Computer**: Unlock the iPhone and tap "Trust" if prompted.
3.  **Select Device in Xcode**: In Xcode, at the top device selector, choose their iPhone.
4.  **Sign with Personal Team**:
    *   Go to **Signing & Capabilities**.
    *   Under **Team**, select your personal Apple ID (it might say "Personal Team").
5.  **Run**: Click the **Play** button (▶️) in Xcode.
6.  **Trust Developer on iPhone**:
    *   The app will install but won't open immediately.
    *   On the iPhone, go to **Settings** -> **General** -> **VPN & Device Management** (or "Profiles & Device Management").
    *   Tap your email address under "Developer App".
    *   Tap **Trust**.
7.  **Open App**: The app will now run.
