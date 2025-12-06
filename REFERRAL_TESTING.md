# Referral System Testing Guide

## Quick Test Steps

### 1. Find Your Invite Code
1. Log into your Weeve account
2. Go to your profile
3. Copy your invite code (format: `JAM-JHJVLP`)

### 2. Test Desktop Flow
1. Open new **incognito/private browser window**
2. Visit: `https://www.tryweeve.com/?ref=JAM-JHJVLP` (use your code)
3. ✅ Should automatically redirect to: `https://www.tryweeve.com/signup?ref=JAM-JHJVLP`
4. Sign up with a new account (use email or Google)
5. Complete profile setup
6. Check that you're automatically friends with the referrer

### 3. Test Mobile Flow
1. Open link on **mobile device** (or use Chrome DevTools mobile emulation)
2. Visit: `https://www.tryweeve.com/?ref=JAM-JHJVLP`
3. ✅ Should automatically redirect to: `https://www.tryweeve.com/signup?ref=JAM-JHJVLP`
4. Complete signup and setup
5. Verify friend connection

### 4. Test Direct Signup Link
1. Share direct link: `https://www.tryweeve.com/signup?ref=JAM-JHJVLP`
2. New user signs up
3. ✅ Should create friend connection

## What Got Fixed

### Before:
❌ Mobile users redirected to `/login` without ref parameter
❌ Landing page didn't redirect users with invite codes
❌ Ref parameter could get lost during navigation

### After:
✅ Mobile users go to `/signup` with ref parameter preserved
✅ Landing page auto-redirects to signup when ref code detected
✅ Ref parameter stored in localStorage immediately
✅ Works for both email and Google signup
✅ Friend connection created automatically on profile setup

## Verify in Browser Console

Open browser developer tools and check localStorage:
```javascript
localStorage.getItem('weeve_invite_code')
// Should return: "JAM-JHJVLP"
```

## Expected User Experience

### For Referrer:
1. Share link with invite code
2. New user signs up
3. Automatically become friends
4. Can see each other's stories/activity

### For New User:
1. Click invite link
2. Taken directly to signup page
3. Complete signup flow
4. Automatically connected to friend who invited them
5. No manual friend request needed!

## Debugging Tips

If friend connection doesn't work:

1. **Check localStorage**
   ```javascript
   console.log(localStorage.getItem('weeve_invite_code'))
   ```

2. **Check invite code exists in database**
   - Query profiles table for matching invite_code
   - Verify it's not null or empty

3. **Check console for errors**
   - Look for auth errors
   - Check friendship creation logs
   - Verify RLS policies allow friendship inserts

4. **Verify in database**
   ```sql
   -- Check friendships table
   SELECT * FROM friendships 
   WHERE user_id = 'new_user_id' OR friend_id = 'new_user_id';
   ```

## Files Changed

- ✅ `src/middleware.ts` - Mobile redirect to signup
- ✅ `src/app/(marketing)/page.tsx` - Auto-redirect with ref
- ✅ `src/app/(auth)/signup/page.tsx` - Store ref in localStorage
- ✅ `src/app/(auth)/login/page.tsx` - Preserve ref parameter
- ✅ `src/app/(auth)/setup/page.tsx` - Already implemented
- ✅ `src/lib/auth.ts` - Already implemented
- ✅ `src/app/components/InviteHandler.tsx` - Already implemented

## Success Criteria

✅ Invite link works on desktop
✅ Invite link works on mobile  
✅ Ref parameter preserved through redirects
✅ Friend connection created automatically
✅ Works with email signup
✅ Works with Google signup
✅ No manual steps needed from user
