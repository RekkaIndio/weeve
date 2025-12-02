# Supabase Setup Instructions

## Step 1: Add Environment Variables

Add the following to your `.env.local` file (create it if it doesn't exist):

```env
NEXT_PUBLIC_SUPABASE_URL=https://fvyhyexdndynoonkzwbd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2eWh5ZXhkbmR5bm9vbmt6d2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ0NDcsImV4cCI6MjA3OTMxMDQ0N30.fIpVJtDhJbUgawZEwuHGPtXr_L6WRoMoCaNek6nUYyg
```

## Step 2: Run Database Schema

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/fvyhyexdndynoonkzwbd
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the schema

This will create all the necessary tables, indexes, and Row Level Security policies.

## Step 3: Verify Schema

After running the SQL:
1. Navigate to **Table Editor** in your Supabase dashboard
2. You should see the following tables:
   - `profiles`
   - `stories`
   - `contributions`
   - `story_participants`
   - `groups`
   - `friendships`

## Step 4: Generate TypeScript Types (Optional)

To get TypeScript types from your database schema:

```bash
npx supabase gen types typescript --project-id fvyhyexdndynoonkzwbd > src/lib/database.types.ts
```

Note: This requires the Supabase CLI. If you don't have it installed, you can skip this step and manually create types as needed.

## Step 5: Enable Google Sign-In

1. In the Supabase dashboard, go to **Authentication → Providers** and open the **Google** provider.
2. Toggle the provider to **Enabled** and ensure the Client ID and Secret you created in Google Cloud are saved.
3. Add the following redirect URLs (include the production domain you will deploy to):
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.com/auth/callback`
4. Click **Save**. Supabase will now accept OAuth redirects for the web app. If you plan to support the Capacitor builds, also add any custom schemes or native callback URLs you configure there.

### Google Cloud Console configuration

Supabase still performs the initial OAuth handshake through its own callback. Add these URIs to the **Authorized redirect URIs** list for the OAuth client ID in [console.cloud.google.com](https://console.cloud.google.com):

- `https://fvyhyexdndynoonkzwbd.supabase.co/auth/v1/callback`
- `http://localhost:3000/auth/callback`
- Any additional environments you pass via `redirectTo` (for example your LAN IP such as `http://192.168.0.185:3000/auth/callback` or your production domain).
- The native deep link used by the Capacitor apps: `com.jay.weeve.app://auth/callback`

Register the same URIs under **Additional Redirect URLs** in Supabase (Authentication → URL Configuration) so Supabase accepts the callback as well.

If you plan to customise the native scheme, update the Capacitor configuration and the `NATIVE_GOOGLE_REDIRECT_URI` constant in `src/lib/auth.ts` to match, then re-run `npx cap sync`. Otherwise keep the default `com.weeve.app://auth/callback` listed above.

## Troubleshooting Google Sign-In

### Common Issues

**1. "redirect_uri_mismatch" error**
- Ensure all redirect URIs are added to Google Cloud Console OAuth client
- Verify Supabase callback URL is included: `https://fvyhyexdndynoonkzwbd.supabase.co/auth/v1/callback`
- Check that the redirect URL in your app matches what's configured in Google Cloud Console

**2. Native app fails to open Google Sign-In**
- Check that bundle ID matches between `capacitor.config.ts` and iOS/Android project
- Verify `iosClientId` is configured in `capacitor.config.ts` (required for iOS)
- Run `npx cap sync` after any configuration changes
- Ensure the native deep link is registered in Google Cloud Console: `com.weeve.app://auth/callback`

**3. "Invalid client" error**
- Verify Client ID and Client Secret in Supabase dashboard match Google Cloud Console
- Ensure correct client IDs for each platform (web, iOS, Android)
- Check that the OAuth client type matches the platform (Web for web, iOS for iOS, Android for Android)

**4. Authentication succeeds but user is not logged in**
- Check browser console for errors in the callback flow
- Verify Supabase session is being set correctly
- Ensure Row Level Security policies allow profile creation/reading

### Bundle ID Consistency

The following must all use the SAME bundle identifier:
- `capacitor.config.ts` → `appId` (currently: `com.weeve.app`)
- `src/lib/auth.ts` → `NATIVE_GOOGLE_REDIRECT_URI` (should match appId)
- iOS Xcode project → Bundle Identifier
- Android `AndroidManifest.xml` → package name
- Google Cloud Console → iOS/Android app registration

### Required Configuration Checklist

Before Google Sign-In will work, ensure:
- [ ] Google OAuth Client ID created for Web application
- [ ] Google OAuth Client ID created for iOS (if supporting iOS)
- [ ] Google OAuth Client ID created for Android (if supporting Android)
- [ ] All three Client IDs configured in `capacitor.config.ts`
- [ ] All redirect URIs added to Google Cloud Console
- [ ] Supabase Google provider enabled with correct credentials
- [ ] Bundle IDs match across all configuration files

## Next Steps

After completing these steps, the application will be ready to use Supabase for data persistence. The next phase involves updating the store and components to use Supabase queries instead of mock data.
