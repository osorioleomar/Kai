# PWA Setup Instructions

Kai is now a Progressive Web App (PWA) that can be installed on iOS and Android devices!

## Required Icon Files

To complete the PWA setup, you need to add the following icon files to the `public` folder:

1. **icon-192x192.png** - 192x192 pixels (for Android)
2. **icon-512x512.png** - 512x512 pixels (for Android)
3. **apple-touch-icon.png** - 180x180 pixels (for iOS)

### Creating Icons

You can create these icons from your app logo. The icons should:
- Be square (equal width and height)
- Have a transparent or solid background
- Use the amber/orange color scheme (#d97706) to match the app theme

### Quick Icon Generation

You can use online tools like:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

Or create them manually using any image editor.

## Installation Instructions

### iOS (iPhone/iPad)

1. Open Safari on your iOS device
2. Navigate to your Kai app URL
3. Tap the Share button (square with arrow pointing up)
4. Scroll down and tap "Add to Home Screen"
5. Customize the name if desired
6. Tap "Add"

The app will now appear on your home screen and can be opened like a native app!

### Android/Chrome

1. Open Chrome on your Android device
2. Navigate to your Kai app URL
3. You'll see an install prompt, or:
   - Tap the menu (three dots)
   - Select "Install app" or "Add to Home screen"
4. Confirm the installation

The app will be installed and can be launched from your app drawer.

## Features

- **Offline Support**: Basic offline functionality via service worker
- **App-like Experience**: Runs in standalone mode (no browser UI)
- **Home Screen Icon**: Custom icon on your device
- **Splash Screen**: Uses your theme color on launch

## Testing

To test the PWA:

1. Build the app: `npm run build`
2. Start the production server: `npm start`
3. Open in a mobile browser or use Chrome DevTools device emulation
4. Check the install prompt appears
5. Test offline functionality

## Notes

- The service worker caches basic resources for offline access
- For full offline functionality, you may want to enhance the service worker to cache API responses
- iOS requires HTTPS for PWA features (except on localhost)
- The app works best when deployed with HTTPS

