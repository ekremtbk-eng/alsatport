# AlsatPort Android (Trusted Web Activity)

Google Play app for https://alsatport.com. It opens the live site in a **Trusted Web Activity** (TWA): full-screen
Chrome (or another TWA-capable browser) without a URL bar, verified against the site with Digital Asset Links.
The web app (Next.js, `/src`) is unchanged; this folder is a separate Gradle project and is excluded from Vercel deploys.

| | |
|---|---|
| Package name | `com.alsatport.app` (permanent: cannot change after the first Play upload) |
| Start URL | `https://alsatport.com/` |
| Library | `com.google.androidbrowserhelper:androidbrowserhelper:2.7.4` |
| Build | AGP 9.4.1, Gradle 9.6.0, JDK 17, compile/target SDK 36, min SDK 24 |
| Permissions | none |

## Why TWA and not a WebView

- Google sign-in is a full-page OAuth redirect. Google blocks it inside embedded WebViews (`disallowed_useragent`);
  in a TWA it runs in real Chrome with the user's Google accounts.
- Sessions, CSRF, 2FA and the e-mail hold live in httpOnly cookies and middleware; a TWA uses the same browser
  cookie jar, so nothing on the server changes.
- Photo upload uses `<input type="file">`; Chrome shows the camera/gallery chooser and asks for camera permission
  itself, so the app declares no permissions.
- Back button, history, downloads, `tel:`/`mailto:`/WhatsApp links and other-origin pages are handled by the browser.
- Web deploys reach app users immediately; the app shell only needs an update for icon/colour/SDK changes.
- If no TWA-capable browser is installed the app falls back to a Custom Tab (never a WebView).

## What the app code does

- `LauncherActivity` extends the library launcher and only lets `https://alsatport.com` URLs in (`UrlPolicy`);
  anything else opens the home page.
- App Links: `https://alsatport.com/*` links from other apps open in AlsatPort (`autoVerify`).
- Splash: Android 12+ system splash plus the browser splash, both brand dark green with the logo.
- HTTPS only (`usesCleartextTraffic=false`, network security config), no backups (the app stores no user data).

## Build

Needs JDK 17 and the Android SDK (platform 36, build-tools 36). Easiest: open this folder in Android Studio.

```bash
# from android/
gradle wrapper --gradle-version 9.6.0   # once, creates gradlew + wrapper jar (or let Android Studio do it)
./gradlew test                          # UrlPolicy unit tests
./gradlew lint
./gradlew assembleDebug                 # app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease                 # app/build/outputs/bundle/release/app-release.aab
```

Icons and store graphics are generated from `/public` (run from the repository root):

```bash
node android/tools/generate-assets.mjs
```

## Signing (do not commit keys)

Use **Play App Signing**: Google holds the app signing key; you sign uploads with an *upload key*.

1. Create the upload key once and keep it outside the repository (password manager + offline backup):
   `keytool -genkeypair -v -keystore alsatport-upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000`
2. Create `android/keystore.properties` (git-ignored):
   ```properties
   storeFile=C:/secure/alsatport-upload.jks
   storePassword=...
   keyAlias=upload
   keyPassword=...
   ```
   or set `ALSATPORT_UPLOAD_STORE_FILE`, `ALSATPORT_UPLOAD_STORE_PASSWORD`, `ALSATPORT_UPLOAD_KEY_ALIAS`,
   `ALSATPORT_UPLOAD_KEY_PASSWORD` in CI.
3. Without these, `bundleRelease` produces an unsigned bundle that Play will not accept.

## Digital Asset Links (removes the URL bar)

1. Play Console → the app → *Test and release → App integrity* → copy the SHA-256 of the **app signing key**
   (and of the **upload key** if you test locally signed release builds).
2. Add them to `ANDROID_CERT_SHA256` in `src/data/androidApp.ts` and deploy the website.
3. Check `https://alsatport.com/.well-known/assetlinks.json` (must be 200, JSON, no redirect) and
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://alsatport.com&relation=delegate_permission/common.handle_all_urls`.

Until then the route answers 404 and the app shows a small URL bar (Custom Tab mode).

## Device test checklist (not done yet)

Run on at least one real phone with Chrome and one with Samsung Internet:
launch/splash, home → listing → back button to exit, search and advanced filters, e-mail login + 2FA, Google login,
logout, e-mail verification link opened from the mail app, listing create/edit with camera and gallery photos,
messaging, favourites, notifications page, corporate account and Acil Acil, phone/WhatsApp links, external links,
offline page, dark mode colours, App Links from WhatsApp (`adb shell pm get-app-links com.alsatport.app`).
