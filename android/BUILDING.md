# Nth Nota Android project, 0.2.0

Status: source prepared, not compiled or device-tested. The working browser prototype is deployed separately. There is no APK in this project yet.

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

No local generative model or cloud API is connected. The tested free-only router can be connected to real adapters after SDK compilation, model evaluation and secure backend/account configuration. No cloud key belongs in this app or its source.

## Required verification before APK delivery

Compile against the real SDK. Test install/relaunch/upgrade, microphone acceptance and denial, native backup export/restore and cancellation, multi-file import, PDF workers, TTS without an installed voice, notification permission denial, reminders after closure/reboot, keyboard insets and stylus handling. Check portrait/landscape and phone/tablet layouts. This project does not claim any of those device tests have passed.

Primary references:
- https://developer.android.com/develop/ui/views/layout/webapps/load-local-content
- https://developer.android.com/develop/background-work/services/alarms
- https://developer.android.com/reference/android/speech/tts/TextToSpeech
- https://developer.android.com/guide/topics/providers/document-provider
