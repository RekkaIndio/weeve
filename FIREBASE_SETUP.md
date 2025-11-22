# Firebase Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAR0-bMUmtLmrz7atzyJO02hlbmnDbTcuQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=weeve-edbc7.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=weeve-edbc7
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=weeve-edbc7.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=957578527300
NEXT_PUBLIC_FIREBASE_APP_ID=1:957578527300:web:a734537e4079d5cb423211
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-5274WRMDL8
```

## Important Notes

1. **All variables must have the `NEXT_PUBLIC_` prefix** for Next.js to expose them to the client-side code.

2. **Restart your dev server** after adding these variables for them to take effect:
   ```bash
   # Stop the current dev server (Ctrl+C)
   # Then restart it
   npm run dev
   ```

3. **Firebase Console Setup** - Make sure to enable these auth providers in your Firebase Console:
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable **Email/Password** authentication
   - Enable **Google** sign-in provider and configure the OAuth consent screen

4. **Security Note**: The API key in `.env.local` is safe to expose on the client side. Firebase security is handled through Security Rules, not by hiding the API key.
