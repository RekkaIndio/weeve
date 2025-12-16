# Referral + App Redirect Quick Reference

## What's New?

Mobile users with referral links are now automatically directed to:
1. **Native app** (if installed) 
2. **App Store/Play Store** (if not installed)

Instead of being stuck in web browser! 🎉

## User Experience

### Before:
❌ Click referral link on phone → stuck in web browser

### After:
✅ Click referral link on phone → opens native app OR redirects to store

## How to Test

### 1. Test with App Installed (on device)

**iOS:**
```bash
xcrun simctl openurl booted "com.weeve.app://signup?ref=JAM-JHJVLP"
```

**Android:**
```bash
adb shell am start -W -a android.intent.action.VIEW -d "com.weeve.app://signup?ref=JAM-JHJVLP" com.weeve.app
```

### 2. Test Full Flow (real device)

1. Share link: `https://www.tryweeve.com/?ref=JAM-JHJVLP`
2. Open on mobile device
3. Should see "Opening Weeve..." screen
4. App should open (if installed) OR redirect to store

### 3. Test on Desktop

1. Open link: `https://www.tryweeve.com/?ref=JAM-JHJVLP`
2. Should stay on marketing page
3. No redirect (desktop users browse normally)

## URLs That Work

```
✅ https://www.tryweeve.com/?ref=JAM-JHJVLP
✅ https://tryweeve.com/?ref=JAM-JHJVLP
✅ com.weeve.app://signup?ref=JAM-JHJVLP
✅ com.weeve.app://feed
```

## Files Changed

- ✅ `src/app/components/SmartAppRedirect.tsx` - NEW
- ✅ `src/app/app-redirect/page.tsx` - NEW
- ✅ `src/middleware.ts` - Updated
- ✅ `capacitor.config.ts` - Updated
- ✅ `android/app/src/main/AndroidManifest.xml` - Updated
- ✅ `ios/App/App/Info.plist` - Updated

## After Publishing to Stores

### iOS:
1. Get your App Store ID (looks like: `id1234567890`)
2. Update in `src/app/app-redirect/page.tsx`:
```typescript
const iosAppStoreUrl = 'https://apps.apple.com/app/weeve/id1234567890';
```

### Android:
Already configured with:
```typescript
const androidPlayStoreUrl = 'https://play.google.com/store/apps/details?id=com.weeve.app';
```

## Next Steps

1. **Rebuild native apps:**
   ```bash
   npx cap sync
   npx cap open ios    # Open in Xcode
   npx cap open android # Open in Android Studio
   ```

2. **Add deep link handler** in your app (see DEEP_LINKING_GUIDE.md)

3. **Test on real devices** before publishing

4. **Update App Store URL** after publishing

## Support

See detailed docs:
- `DEEP_LINKING_GUIDE.md` - Complete technical guide
- `REFERRAL_SYSTEM_GUIDE.md` - Referral system details
- `REFERRAL_TESTING.md` - Testing procedures

## Quick Troubleshooting

**App not opening?**
- Rebuild: `npx cap sync`
- Check scheme in capacitor.config.ts
- Verify intent filters in AndroidManifest.xml

**Store redirect not working?**
- Update store URLs in app-redirect/page.tsx
- Make sure app is published

**Ref code lost?**
- Check localStorage in browser console
- Verify middleware preserves query params
