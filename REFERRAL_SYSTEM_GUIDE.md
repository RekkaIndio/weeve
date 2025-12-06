# Referral System Guide

## Overview
The Weeve referral system allows users to share invite links that automatically connect new users as friends when they sign up.

## How It Works

### 1. Invite Code Format
Each user gets a unique invite code in format: `USERNAME-XXXXXX` (e.g., `JAM-JHJVLP`)
- Generated automatically when profile is created
- Stored in `profiles.invite_code`

### 2. Referral Link Structure
```
https://www.tryweeve.com/?ref=JAM-JHJVLP
```

### 3. User Journey Flow

#### Desktop Users:
1. User visits `https://www.tryweeve.com/?ref=JAM-JHJVLP`
2. Marketing page detects `ref` parameter
3. Automatically redirects to `/signup?ref=JAM-JHJVLP`
4. Signup page stores ref code in localStorage
5. After signup → redirected to `/setup`
6. Setup page retrieves ref code from localStorage
7. Creates profile AND adds friend connection with referrer

#### Mobile Users:
1. User visits `https://www.tryweeve.com/?ref=JAM-JHJVLP`
2. Middleware detects mobile device
3. Automatically redirects to `/signup?ref=JAM-JHJVLP` (preserving ref parameter)
4. Rest of flow same as desktop

### 4. Technical Implementation

#### Files Modified:

**src/middleware.ts**
- Changed mobile redirect from `/login` to `/signup`
- Preserves query parameters during redirect

**src/app/(marketing)/page.tsx**
- Detects `ref` parameter on landing page
- Redirects to `/signup?ref=CODE` for users with invite codes

**src/app/(auth)/signup/page.tsx**
- Stores `ref` parameter in localStorage on page load
- Works for both email and Google signup

**src/app/(auth)/login/page.tsx**
- Stores `ref` parameter in localStorage (in case user has account)
- Preserves ref parameter in "Sign up" link

**src/app/(auth)/setup/page.tsx** (already implemented)
- Retrieves `weeve_invite_code` from localStorage
- Passes to `createUserProfile()`
- Auto-connects with referrer

**src/lib/auth.ts** (already implemented)
- `createUserProfile()` accepts `referrerCode` parameter
- Looks up referrer by invite code
- Calls `addFriend()` to create bidirectional connection

#### Components:

**src/app/components/InviteHandler.tsx** (already exists)
- Global component in root layout
- Stores ref parameter in localStorage for all pages

### 5. Friend Connection Logic

When a new user signs up with referral code:
```typescript
// In createUserProfile()
if (referrerCode) {
    const { data: referrer } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('invite_code', referrerCode)
        .single();

    if (referrer) {
        await addFriend(userId, referrer.user_id);
    }
}
```

The `addFriend()` function creates a bidirectional friendship:
- New user follows referrer
- Referrer follows new user

## Testing the System

### Test Flow:
1. Get your invite code from your profile
2. Share link: `https://www.tryweeve.com/?ref=YOUR-CODE`
3. Open link in incognito/private browser
4. Should redirect to signup page with ref parameter
5. Sign up with new account
6. Complete setup
7. Both users should now see each other as friends

### Debug Checklist:
- [ ] Ref parameter in URL is preserved through redirects
- [ ] localStorage stores 'weeve_invite_code'
- [ ] Setup page retrieves code from localStorage
- [ ] Referrer exists in database with matching invite code
- [ ] Friend connection created in both directions

## Database Schema

### profiles table
```sql
- user_id (uuid, primary key)
- name (text)
- invite_code (text, unique) -- User's personal invite code
- ...other fields
```

### friendships table
```sql
- id (uuid, primary key)
- user_id (uuid) -- Person who initiated
- friend_id (uuid) -- Person they're connected to
- status (text) -- 'pending' or 'accepted'
- created_at (timestamp)
```

## Common Issues & Solutions

### Issue: Ref parameter gets lost
**Solution:** Check middleware preserves query params:
```typescript
url.search = request.nextUrl.search
```

### Issue: Friend connection not created
**Solutions:**
1. Check invite code exists and matches
2. Verify `addFriend()` function works
3. Check RLS policies on friendships table

### Issue: LocalStorage not working
**Solutions:**
1. Ensure client-side component ('use client')
2. Check browser allows localStorage
3. Verify InviteHandler is mounted in layout

## Future Enhancements

- [ ] Track referral analytics (who referred whom)
- [ ] Reward system for referrals
- [ ] Custom invite messages
- [ ] QR code generation for invite links
- [ ] Social media sharing integration
