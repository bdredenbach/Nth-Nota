# Nth Nota 0.3.2

An Nth Experience app for notes, sketches, tasks and ideas. Includes the offline browser editor and Android preview project. No paid AI service or client-side cloud key is configured. The Android preview connects to the owner’s free gateway after explicit user opt-in.

## Build and test

Use Node.js 22 or later. Run `npm install --ignore-scripts`, `npm run prepare:vendor`, then `npm test`. Vendor bundles are restored from exact npm package versions and checked against the original SHA-256 hashes.

Pushing app changes to `main` starts the Android preview workflow. Its APK and checksum appear in the successful Actions run’s artifacts. Open the Android project in Android Studio or use Gradle 8.13 with SDK 36/JDK 17 for a local build. See [android/BUILDING.md](android/BUILDING.md).

## Working features
- Separate workspaces with individual card arrangements; desktop canvas and responsive list layout.
- Movable, resizable notes, tasks, images, drawings, PDF documents and audio cards.
- Rich text with basic formatting, local autosave via IndexedDB, favorites, search across workspaces and comparison.
- Sketch, handwriting/cursive capture, highlighting, erasing, pressure-sensitive digital ink on supported styluses, undo and redo.
- PDF page rendering and annotation; PDF export preserves original pages with drawing overlays.
- Image rotation, center square crop, grayscale, markup and PNG export.
- DOCX text, TXT, Markdown, HTML, PDF, image and audio import; file drag and drop; image cards can be attached alongside notes/tasks.
- DOCX/PDF/TXT/Markdown/HTML note export. DOCX preserves Unicode; prototype PDF text uses standard Latin fonts.
- Microphone voice recording (two-minute prototype limit) and browser speech synthesis readback when supported.
- Custom reminder title, message, date, repeat and optional tone; in-page/browser alerts while page is open.
- Numeric equation completion on equals using a parser without eval.
- Downloadable full JSON backups with validation and explicit restore confirmation.

## Added in 0.2

- Installable web app manifest and offline shell cache; apply updates explicitly after saving. Offline readiness depends on browser support and one complete online preparation.
- Recently Deleted with restore and explicit permanent deletion. Deleted reminders are paused.
- Up to 15 text history snapshots per note, with restore and backup preservation.
- Revision-checked writes protect newer notes from a stale second window. A conflicting window preserves its unsaved copy and offers backup before reload.
- Free-only AI router with tested task selection, provider/model quota scopes, retry cooldowns, context preservation, cancellation and privacy gating. Version 0.3 registers the Android local engine and an optional owner-configured gateway.
- Android project in android/ with bundled editor, native file pickers and chunked export, offline TTS and inexact reminders. The first Android APK compiled successfully on GitHub Actions and passed APK v2 signature verification. Physical-device testing is still pending. See android/BUILDING.md.

## Intentional prototype limits
The Gemini Nano integration compiles against the real ML Kit SDK, but inference quality and phone compatibility still need physical-device testing. The owner deployed the Cloudflare gateway on Workers Free and demonstrated an HTTP 200 proofreading response on October 19, 2026. The Android 0.3.1 build now includes that public endpoint. Native in-app cloud requests and local inference still need phone testing. Cursive-to-text, device verification of notifications, background audio and cross-device sync remain future work. No model picker or user API-key input is exposed. Local text-to-task conversion is labeled as a built-in tool, not AI.

Document import extracts paragraphs, not full Word layout, tables, tracked changes or embedded media. Image attachments are placed on the workspace beside their parent item. PDF and attachment import has a 12 MB per-file prototype limit. PDF annotations on rotated/cropped pages need device testing. Backups are readable JSON and must be stored privately.

Notes are stored in the current browser's IndexedDB. Clearing its data removes the local desk. Backups are the portable recovery mechanism. First launch includes sample content.

## Validation

The pure JavaScript checks run with Node.js. Storage checks additionally need fake-indexeddb 6.2.4; set NOTA_FAKE_IDB to its installed absolute path or install that package locally.

`node --check dist/app.js`
`node --check dist/core.js`
`node checks/core.test.cjs`
`node checks/exports.test.cjs`
`node --test checks/router.test.cjs checks/offline.test.cjs checks/storage.test.cjs`

The exports smoke test exercises the same locally bundled libraries served to the browser. Browser/device QA was unavailable during the initial build; verify rendering, microphone permission, stylus behavior and downloads on target devices.

Third-party browser libraries and their licenses are in dist/vendor. All runtime assets are local; there are no external CDN dependencies.

No paid service is configured. Adding a cloud adapter requires an independently verified free plan, server-held credentials, allowance tracking and hard stop behavior. Router flags alone do not enforce a provider billing account configuration.

## First verified Android preview

Nth Nota 0.2.0 built successfully in [GitHub Actions](https://github.com/bdredenbach/Nth-Nota/actions/runs/39176169879). All 25 JavaScript checks passed, the APK signature verified, and all 22 bundled editor assets matched the source. Package: `com.nthexperience.nota.preview`, minimum Android 8 (API 26), target API 36. The APK is ready for phone testing; no physical-device tests or live AI connection are claimed. See [build verification](docs/android-build-verification.json).

## Added in 0.3

- Shared italic N icon, with “th” above “ota,” including adaptive and monochrome Android icons. The outlined lettering is derived from URW Base35 Nimbus Roman Italic; no font binary is embedded.
- Android on-device writing assistance through ML Kit’s Gemini Nano Prompt API, with availability checks, first-use model preparation, progress, cancellation, short-request limits and foreground lifecycle handling. No API key is needed. Supported device/AICore configuration is required; unsupported phones show an honest status.
- Proofread, polish, idea board, drafting and summarization tasks. Recent conversation and selected note context are carried between turns. Replies can be copied, read back, or saved as a separate note; original writing is not overwritten.
- Optional HTTPS cloud gateway with server-held provider secrets, atomic global/per-connection daily caps, provider cooldowns, Cloudflare-to-Groq failover, and hard stop when free capacity is unavailable. No account rotation or paid fallback. Cloud calls require explicit opt-in, which is held in app-private native preferences rather than restored from a desk backup.
- Version 0.3.0 had no gateway URL. Version 0.3.1 includes the verified owner-operated gateway; cloud permission stays off until the user opts in. Owner activation instructions: [cloud/README.md](cloud/README.md). Ordinary app users never enter keys or select models.

The local integration is not a continuously running background service: it checks and uses available engines when assistance is requested. Android’s on-device generation requires the app to be in the foreground. Automatic switching preserves context but different models can produce different quality or style.

## Verified 0.3 Android preview

Version 0.3.0 built in [GitHub Actions](https://github.com/bdredenbach/Nth-Nota/actions/runs/39177629344). All 38 automated checks passed, APK v2 signing verified, and all 23 bundled web assets matched source. The corrected signing-key cache saved successfully. This preview's signing certificate differs from 0.2: export a full desk backup before any reinstall and restore it afterward. See [verification record](docs/android-build-verification-0.3.json). Physical-device AI and live cloud inference have not been tested; cloud activation still needs the owner's free account.

## Added in 0.3.1

- Bundles the public endpoint `https://nth-nota-free-ai.bdredenbach.workers.dev/v1/write` from `android/ai-gateway.properties`. No provider key is bundled. The existing `NOTA_AI_GATEWAY_URL` build override is still supported; clear the properties-file URL to build with no gateway.
- The owner confirmed Workers Free, created the `quota` and `cooldown` tables, bound `AI` and `DB`, saved the private salt and free-plan flag, and disabled Worker logs. A live dashboard HTTP test returned 200 with corrected text. No Groq key has been configured.
- Cloud assistance remains opt-in in the app's Settings. Automatic routing tries on-device assistance first; suitable availability failures can use the free gateway. Safety and invalid-input failures do not hop to another provider.
- Daily quota cleanup requires the owner to add the `7 0 * * *` UTC Cron Trigger to the manually deployed Worker; this scheduling step is pending confirmation. Device-level installation, inference and end-to-end consent testing remain pending.

## Verified 0.3.1 Android preview

The [0.3.1 workflow](https://github.com/bdredenbach/Nth-Nota/actions/runs/39245154789) completed successfully. All 38 checks passed; the APK v2 signature and all 23 bundled editor assets verified. Native bytecode contains the expected gateway URL. The signing certificate matches 0.3.0, so those two previews are compatible for normal in-place updates. See [verification record](docs/android-build-verification-0.3.1.json). The owner’s dashboard test proved live cloud proofreading; native in-app cloud and local inference still await phone testing.

## Added in 0.3.2

- All letters in the shared-N mark now use URW Z003 calligraphic cursive outlines. No font binary is embedded.
- The green icon plate is a square. Android still chooses the outer launcher mask; an inset square on paper keeps the green plate visibly square inside circular launchers. The themed icon uses a square with the script lettering cut out.
- The previous italic mark is preserved in `artwork/icon-options/old-italic.svg` and `.png`. A code-rendered launcher comparison is in `artwork/icon-options/comparison.png`.
- The writing assistant and verified free gateway configuration carry forward from 0.3.1. In-app phone testing and the daily cleanup schedule remain pending owner confirmation.

## Verified 0.3.2 Android preview

The [0.3.2 workflow](https://github.com/bdredenbach/Nth-Nota/actions/runs/39246397637) passed all 38 automated checks and APK v2 signature verification. All 23 bundled editor assets matched source. The certificate matches 0.3.0/0.3.1, and native code retains the verified free gateway address. The square plate fits Android's circular adaptive mask; standard and themed vector artwork were visually inspected. The comparison is a code-rendered approximation of launcher presentation, not a phone screenshot. See [verification record](docs/android-build-verification-0.3.2.json).
