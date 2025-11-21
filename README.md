This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Update App Icons

To use `weeve-logo.png` as the app icon and favicon:

- Web: `weeve-logo.png` is included in `public/`. The Next.js app metadata now uses `/weeve-logo.png` for the favicon and Open Graph image.
- Android: copy a suitably sized `weeve-logo.png` into `android/app/src/main/res/mipmap-*/weeve_logo.png` (mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi) and/or `drawable/weeve_logo.png`. The adaptive icon `mipmap-anydpi-v26/ic_launcher.xml` now references `@drawable/weeve_logo`.
- iOS: copy `weeve-logo.png` into `ios/App/App/Assets.xcassets/AppIcon.appiconset/weeve-logo.png` (add required sizes if needed). `Contents.json` references this filename.

Note: You should replace the native image files with properly sized images for each platform density for best results.
