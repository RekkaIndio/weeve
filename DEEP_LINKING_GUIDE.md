# Deep Linking & App Redirect System

## Overview
The Weeve app now intelligently redirects users to the native mobile app when they click referral links, providing a seamless experience across platforms.

## How It Works

### User Journey

#### Mobile Users with Referral Code:
1. User clicks: `https://www.tryweeve.com/?ref=JAM-JHJVLP`
2. Middleware detects mobile device + ref parameter
3. Redirects to: `/app-redirect?ref=JAM-JHJVLP`
4. App redirect page detects platform (iOS/Android)
5. Attempts to open native app via deep link: `weeve://signup?ref=JAM-JHJVLP`
6. If app installed: Opens directly to signup with ref code
7. If app not installed: Redirects to App Store/Play Store

#### Desktop Users:
1. User clicks: `https://www.tryweeve.com/?ref=JAM-JHJVLP`
2. Marketing page shows with SmartAppRedirect component
3. If mobile detected: Opens app or redirects to stores
4. If desktop: Stays on marketing page

### Deep Link Formats

```
weeve://feed                    # Opens to main feed
weeve://signup?ref=JAM-JHJVLP  # Opens to signup with referral code
weeve://story/[id]             # Opens specific story
weeve://profile/[username]     # Opens user profile
```

## Technical Implementation

### Files Created/Modified

1. **src/app/components/SmartAppRedirect.tsx**
   - Detects platform (iOS/Android/Web)
   - Attempts to open native app
   - Falls back to app stores

2. **src/app/app-redirect/page.tsx**
   - Dedicated redirect page for mobile users
   - Shows loading state while opening app
   - Handles fallback to app stores

3. **src/middleware.ts**
   - Detects mobile users with ref codes
   - Redirects to `/app-redirect` page

4. **capacitor.config.ts**
   - Added deep linking scheme configuration
   - Supports `weeve://` URL scheme

5. **android/app/src/main/AndroidManifest.xml**
   - Added deep link intent filters
   - Supports both `weeve://` and `https://tryweeve.com`
   - Enables App Links (verified universal links)

6. **ios/App/App/Info.plist**
   - Added `weeve://` URL scheme
   - Enables deep linking on iOS

### Deep Link Configuration

#### Android (`AndroidManifest.xml`)
```xml
<!-- Deep linking for weeve:// URLs -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="weeve" />
</intent-filter>

<!-- Universal Links (https://tryweeve.com) -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="tryweeve.com" />
    <data android:scheme="https" android:host="www.tryweeve.com" />
</intent-filter>
```

#### iOS (`Info.plist`)
```xml
<dict>
    <key>CFBundleURLName</key>
    <string>Weeve Deep Link</string>
    <key>CFBundleURLSchemes</key>
    <array>
        <string>weeve</string>
    </array>
</dict>
```

## App Store Configuration

### iOS App Store
Update in `src/app/app-redirect/page.tsx`:
```typescript
const iosAppStoreUrl = 'https://apps.apple.com/app/weeve/idXXXXXXXXXX';
```
Replace `idXXXXXXXXXX` with your actual App Store ID.

### Android Play Store
Already configured:
```typescript
const androidPlayStoreUrl = 'https://play.google.com/store/apps/details?id=com.weeve.app';
```

## Universal Links Setup (Optional but Recommended)

### For Android:
1. Host `assetlinks.json` at: `https://tryweeve.com/.well-known/assetlinks.json`
2. Content:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.weeve.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

### For iOS:
1. Host `apple-app-site-association` at: `https://tryweeve.com/.well-known/apple-app-site-association`
2. Content:
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAM_ID.com.weeve.app",
      "paths": ["*"]
    }]
  }
}
```

## Testing

### Test Deep Links

#### On iOS (Simulator or Device):
```bash
xcrun simctl openurl booted "weeve://signup?ref=JAM-JHJVLP"
```

#### On Android (Device via ADB):
```bash
adb shell am start -W -a android.intent.action.VIEW -d "weeve://signup?ref=JAM-JHJVLP" com.weeve.app
```

### Test User Flow

1. **With App Installed:**
   - Click referral link on mobile
   - Should open app directly
   - Should navigate to signup with ref code

2. **Without App Installed:**
   - Click referral link on mobile
   - Should show "Opening Weeve..." screen
   - After 2.5 seconds, redirect to store

3. **Desktop:**
   - Click referral link on desktop
   - Should stay on marketing page
   - Can manually download app

## Handling Deep Links in App

You need to add deep link handling in your app code. Here's a basic example:

### In App Component (`src/app/components/AuthProvider.tsx` or similar):

```typescript
import { App as CapacitorApp } from '@capacitor/app';

useEffect(() => {
  // Handle app being opened via deep link
  CapacitorApp.addListener('appUrlOpen', (event: any) => {
    const url = event.url;
    console.log('App opened with URL:', url);
    
    // Parse the URL
    const urlObj = new URL(url);
    const path = urlObj.host; // e.g., 'signup', 'feed', 'story'
    const params = Object.fromEntries(urlObj.searchParams);
    
    // Handle different paths
    if (path === 'signup' && params.ref) {
      // Store ref code and navigate to signup
      localStorage.setItem('weeve_invite_code', params.ref);
      router.push('/signup');
    } else if (path === 'feed') {
      router.push('/feed');
    } else if (path === 'story') {
      const storyId = urlObj.pathname.split('/')[1];
      router.push(`/story/${storyId}`);
    }
  });
}, []);
```

## Platform Detection Logic

The system uses multiple signals to detect platform:
```typescript
const detectPlatform = () => {
  const userAgent = navigator.userAgent;
  
  // iOS detection
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'ios';
  }
  
  // Android detection
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  return 'web';
};
```

## Fallback Strategy

1. **First attempt (0ms):** Create hidden iframe with deep link
2. **Second attempt (100ms):** Direct window.location to deep link
3. **Fallback (2500ms):** If page still visible, redirect to store
4. **Early exit:** If app opens (page hidden), cancel fallback timer

## Benefits

✅ **Seamless UX**: Users go directly to app if installed
✅ **Smart Fallback**: Auto-redirects to store if app not installed
✅ **Ref Code Preserved**: Referral codes carried through entire flow
✅ **Platform Aware**: Different behavior for iOS/Android/Desktop
✅ **Progressive Enhancement**: Works with or without app installed

## Troubleshooting

### Deep Link Not Opening App

1. **Verify scheme is registered:**
   - iOS: Check Info.plist for `weeve` scheme
   - Android: Check AndroidManifest.xml intent filters

2. **Rebuild native apps:**
   ```bash
   npx cap sync
   npx cap open ios
   npx cap open android
   ```

3. **Check URL format:**
   - Must be exactly: `weeve://path?params`
   - No spaces or special characters

### Store Redirect Not Working

1. **Update store URLs** in `src/app/app-redirect/page.tsx`
2. **Verify app is published** in stores
3. **Check app IDs match** bundle identifiers

### Ref Code Lost

1. **Check localStorage** in browser console
2. **Verify middleware** preserves query params
3. **Check deep link handler** stores ref code

## Next Steps

- [ ] Publish app to App Store (get real App Store ID)
- [ ] Update iOS store URL in app-redirect page
- [ ] Set up Universal Links (assetlinks.json & apple-app-site-association)
- [ ] Add deep link handling in native app code
- [ ] Test with real devices
- [ ] Monitor analytics for conversion rates
