# Nth Nota Android project, 0.3.3

Status: the 0.3.3 preview APK compiled successfully on GitHub Actions, passed all 38 automated checks, and passed APK v2 signature verification. Its certificate matches 0.3.0, and its native code contains the verified Cloudflare gateway URL. A live HTTP dashboard test succeeded; native in-app cloud and local inference still need physical-device testing. The working browser prototype is deployed separately.

This is an Android WebView application with the complete local editor bundled into its assets. It does not load the hosted prototype. Android notes use app-private WebView storage, separate from browser notes. Export a JSON backup from the browser and restore it in the Android app to transfer a desk.

## Build

Use Android Studio with JDK 17, Android SDK 36 and Gradle 8.13. Open this android directory as the project. Configure Gradle 8.13 as the distribution if prompted. Wrapper properties are supplied; the wrapper JAR and command scripts are not bundled. With Gradle 8.13 installed, run:

    gradle -p android assembleDebug

from the repository root, after `npm install --ignore-scripts` and `npm run prepare:vendor`. The output is android/app/build/outputs/apk/debug/app-debug.apk. The .github/workflows/android-apk.yml workflow supplies those build tools on GitHub and verifies the APK signature. The workflow caches the generated preview key for subsequent runs, but a cache is not a durable production signing solution.

Before installing a succession of test APKs, configure a persistent signing key outside the repository. A new runner's generated debug key may differ, preventing in-place updates. Never uninstall an existing app without exporting its notes first. No production signing key is generated or bundled.

## Device integration prepared

- Local HTTPS asset responses for secure WebView origins and browser APIs. File access is disabled; remote WebView requests are blocked. CSP blocks frames, objects, external scripts, forms and external network connections. HTTPS links open in the system browser.
- Native system file chooser for import. Blob exports stream bounded chunks to a temporary file and then use ACTION_CREATE_DOCUMENT. There is no broad storage permission.
- Runtime microphone permission, granted only to the bundled origin's audio-capture request.
- Android TextToSpeech selects an installed voice that reports no network requirement. This version has no persistent foreground readback service; screen-off/background behavior remains a separate milestone.
- Notification permission and separate quiet/sound channels. AlarmManager schedules inexact reminders outside the Activity lifetime. Boot/app-update/time-change receivers reschedule them. Android battery policies can delay delivery; force-stopped apps require relaunch. No exact-alarm permission is requested.
- Reminder edits, trashing, removal and backup replacement synchronize with scheduled alarms. Native delivery state is merged into the desk when it resumes to prevent duplicate one-time alerts and retain recurrence.
- Application allowBackup is false: explicit Nth Nota backups are the portable recovery method. No automatic cloud copy is claimed.

Gemini Nano is connected through `LocalAI.java` and ML Kit Prompt API 1.0.0-beta4. Compatibility and availability are queried at runtime; first use can download model assets through AICore. Requests pause/cancel when the Activity leaves the foreground. No physical-device inference has been verified.

`CloudAI.java` connects only to an owner-fixed HTTPS gateway when the build includes `NOTA_AI_GATEWAY_URL` and the user explicitly enables cloud assistance. Version 0.3.1 reads the owner’s verified public URL from `android/ai-gateway.properties`; `NOTA_AI_GATEWAY_URL` can override it at build time. Clear the properties-file URL to build without a gateway. Cloud permission still defaults to off. Redirects are rejected, request/response sizes and timeouts are bounded, and opt-out cancels in-flight client requests. A provider may finish a request it already received after cancellation. No provider key belongs in this app or source. See [cloud activation](../cloud/README.md).

## Remaining device verification

Compilation against the real SDK and APK signature verification have passed. Test install/relaunch/upgrade, microphone acceptance and denial, native backup export/restore and cancellation, multi-file import, PDF workers, TTS without an installed voice, notification permission denial, reminders after closure/reboot, keyboard insets and stylus handling. Check portrait/landscape and phone/tablet layouts. This project does not claim any of those device tests have passed.

Primary references:
- https://developer.android.com/develop/ui/views/layout/webapps/load-local-content
- https://developer.android.com/develop/background-work/services/alarms
- https://developer.android.com/reference/android/speech/tts/TextToSpeech
- https://developer.android.com/guide/topics/providers/document-provider

ML Kit reference: https://developers.google.com/ml-kit/genai/prompt/android/get-started

## Preview signing transition

The first 0.2 key was not retained by the runner's default path. Version 0.3 explicitly uses a generated key at `NOTA_PREVIEW_KEYSTORE` and caches that exact path. This improves continuity while the cache survives; production requires a securely backed-up owner key. The 0.3 certificate differs from 0.2, so Android may reject an in-place update. Export a full desk backup first. If a reinstall is needed, restore that backup afterward. Never uninstall a desk with unexported notes.

Version 0.3.2 changes the shared-N icon to cursive lettering on a square green plate, inset inside the launcher-controlled outer mask. Previous artwork and a launcher comparison are preserved in `artwork/icon-options/`. AI behavior and gateway configuration carry forward from 0.3.1.

Version 0.3.3 lowers the cursive th and fills the complete adaptive background with the centre’s green, removing the cream surround. It uses the same signing certificate and AI configuration as 0.3.2.
