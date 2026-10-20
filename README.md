# Nth Nota 0.13.4

An Nth Experience app for notes, sketches, tasks and ideas. Includes the offline browser editor and Android preview project. No paid AI service or client-side cloud key is configured. The Android preview connects to the owner’s free gateway when Cloud AI is enabled. It defaults on for new installs; previous opt-outs are respected.

## Web preview in 0.13.4

The complete PWA can publish from GitHub Actions to **https://bdredenbach.github.io/Nth-Nota/**. Enable GitHub Actions in the repository’s Pages settings, then run **Nth Nota web preview**. The workflow restores all browser libraries, tests project paths and offline saved notes in Chromium and WebKit, and publishes `index.html` at the site root.

On iPhone, open the site in Safari and choose **Share → Add to Home Screen**. Keep **Open as Web App** enabled if shown, then tap **Add**. Notes stay in that browser or installed app; use Backup & restore to keep a copy.

See [web preview setup and testing](docs/0.13.4-web-preview.md).

## Refined in 0.13.3

The practice tour is fully manual. Explore the tour opens a prepared example; Next demonstrates only the chosen step and waits for you. Back, chapter selection, demonstration speed, Try it, and Exit remain available. Back to tour returns from practice without losing your practice changes. Automatic playback and the Play/Pause button have been removed.

See [manual tour notes](docs/0.13.3-manual-tour.md).

## Refined in 0.13.2

Automatic tour steps pause for four additional seconds before advancing. Demonstration animations and manual controls retain their existing speed.

See [tour timing notes](docs/0.13.2-tour-timing.md).

## Added in 0.13.1

- Tutorial → Watch the tour plays demonstrations in the actual editors, using a temporary practice desk.
- Twenty-five chapters show writing, tasks, drawings, calculations, calendars, reference tools, scans, and more. Each tool’s contextual tour also has Show me.
- Play/Pause, Back/Next, a chapter picker, pace controls and Try it let people watch or explore at their own speed. Exit restores the original open editor and draft.
- Practice data is never written to the saved desk. Prepared AI replies demonstrate review and replacement without sending requests; recordings, permissions, file pickers and real device scanning require leaving the practice tour.

See [automated walkthrough notes](docs/0.13.1-automated-tour.md).

## Added in 0.13.0

- Scanner turns camera scans or imported pictures into PDFs, with page order, rotation, paper appearance, trimming and a saved preview.
- Index Builder provides multiple tabs, custom fields, linked reference entries, and tag and text filters.
- Snippet Shelf keeps literal reusable text, code and Markdown. Its shared editor button inserts a block at the selected field or passage.
- Streak Board records daily amounts, heat maps, current and best streaks, and personal progress goals.
- Flash Cards supports tagged decks, question/answer editing, shuffled practice, and self-ratings that survive reloads.
- Writing Companion adds a Send this writing button above an ornamental “or” divider. Reminder composition now includes the shared writing controls and a persistent-notification action that needs no schedule.
- Explicit dates in writing offer Remember suggestions. Accepted suggestions become real calendar events, with dots and event details in the canvas month widget.

See [0.13.0 release notes](docs/0.13.0-desk-tools.md) for behavior, bounds and verification.

## Added in 0.12.0

- New and restored items share non-overlapping placement and automatically reveal themselves on the canvas or in the list.
- Writing Companion can replace or add to selected writing in the current editor, preserving the item and its structured fields. Saving a separate note remains an explicit option.
- Handwriting Auto adds recognized batches after a pause, with alternate readings and an undo action that restores ink.
- New reminders create canvas notes when saved. Independent persistent notifications pin an existing item without requiring a schedule.
- Desk Menu tools use expandable, borderless categories, with matching tools revealed by search.

See [0.12.0 release notes](docs/0.12.0-connected-editors.md) for behavior and verification.

## Added in 0.6.0

- Declares MODIFY_AUDIO_SETTINGS alongside RECORD_AUDIO for WebView microphone capture. Microphone grants remain limited to the bundled app origin. Recording failures now distinguish denied permission, busy microphones and unsupported capture.
- Voice recording disables repeated Start taps, stops and releases the microphone on close or background, and provides playback before saving. Saved recordings expose Transcribe.
- On-device speech-to-text for saved and imported audio uses ML Kit Speech Recognition 1.0.0-alpha1. Advanced mode is tried first, then Basic when unavailable. Supported devices/languages are checked before processing; no cloud audio or paid fallback is configured.
- Audio is decoded locally to mono 16 kHz PCM and delivered through a real-time paced pipe. This preview accepts files up to two minutes for transcription. First use can download a speech model with visible byte progress.
- Transcripts are reviewable and editable, persist with their source audio in backups, and can be saved as separate notes. Stop/close/background cancels transcription without deleting the audio.
- Includes the Organize tool and responsive six-tool ribbon from 0.5.3.

## Added in 0.5.3

- Organize groups selected text or a note into headings, bullets and checklists. Suggestions appear in chat; Save as note creates a separate note and leaves the source unchanged.
- All six tools stay visible in a three-column phone ribbon and a six-column wider layout.
- Organize preserves the full task instructions while using the existing polish transport category for the native bridge and gateway. Existing deployed Cloudflare code and keys need no update.

## Added in 0.5.2

- Digital ink supports fingers automatically: slower strokes grow thicker and faster strokes become finer. This is a speed-based effect, not a claim of measured finger force.
- Stylus ink retains hardware pressure, including genuine zero values. Sketch/handwriting, highlighter and eraser retain even widths.
- One pointer owns each stroke; secondary touches cannot splice into it. Cancellation and lost capture save the current stroke safely.
- Point widths are stored with the drawing for reopening, backups, undo/redo and PNG/PDF export.

## Added in 0.5.1

- Note paper colors keep their fill and use a circular selection ring with larger touch targets.
- Save to workspace retains an open card, switches to its workspace, and reveals it. The title-bar × still saves and closes the card.
- Saved notes includes a trash button beside Restore. It moves the note to Recently deleted; permanent deletion remains a separate confirmed action there.
- Settings combines the AI rows under Cloud AI while preserving the existing toggle and local-first routing.

## Added in 0.5.0

- Chat-style AI conversations with genuine Sent/Received/Replied states, working dots, saved history, and Retry for stopped messages. Recent context is passed automatically; original notes remain unchanged.
- Download/preparation dialog uses Android byte counts and a real percentage when a total is available. Unknown sizes stay indeterminate. The dialog can be dismissed while work continues.
- Stop detaches the request and discards late results instead of force-cancelling AICore futures or interrupting its download thread. Pending native work blocks overlapping local inference until it settles.
- Local AI is automatic when requested. Free cloud defaults to enabled for a new preference, with a visible switch; explicit previous opt-outs are respected. Cloudflare and optional configured Groq remain the only cloud providers. Grok/xAI is not a verified free API and is not connected. Groq still needs the owner’s server-held free-plan key.
- The shared monogram lowers th again across launcher densities, themed icon and in-app artwork.

## Added in 0.4.2

The original Nth Nota Desk menu opens upward from the bottom dock. It includes local search for tools, workspaces and saved note content, quick creation tools, workspace switching, favorites, saved/recent notes, settings and backups. It uses Nth Nota artwork and the active app palette. Escape, Android Back, the close button, a second tap on Desk and clicking outside dismiss it. Keyboard focus stays inside the panel while open. Existing sidebar preferences remain available on larger screens.

## Added in 0.4.1

Blue and Rosy pink join Paper and Dark paper in Settings → Theme. Each includes matching navigation, workspace, note chrome, buttons and Android system bars. Theme preferences persist on this device and travel with desk backups; existing dark-paper preferences remain supported.

## Added in 0.4.0

- Compact Android layout with native inset handling and system bars that follow the app theme.
- A visible Menu button, dismissible navigation drawer, and a saved sidebar preference for larger screens.
- Readable dark paper, a lighter workspace, and contrasting note colors.
- Title-bar controls to minimize, maximize, or save and close notes. Minimized notes appear in a dock; closed notes remain in Saved notes. Closing never deletes content.
- Canvas is the default on every screen size. Drag title bars to move notes without entering Focus view; List view remains available in Settings.
- The APK hides web installation controls. Settings and descriptions use shorter copy.

## Build and test

Use Node.js 22 or later. Run `npm install --ignore-scripts`, `npm run prepare:vendor`, then `npm test`. Vendor bundles are restored from exact npm package versions and checked against the original SHA-256 hashes.

Pushing app changes to `main` starts the Android preview workflow. Its APK and checksum appear in the successful Actions run’s artifacts. Open the Android project in Android Studio or use Gradle 8.13 with SDK 36/JDK 17 for a local build. See [android/BUILDING.md](android/BUILDING.md).

## Working features
- Separate workspaces with individual card arrangements; touch-draggable canvas on phones and desktops, plus an optional list view.
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

The exports smoke test exercises the same locally bundled libraries served to the browser. The Android workflow also runs real Chromium checks of phone, narrow-phone, landscape, and desktop layouts, touch dragging, note window controls, saved-note recovery, dark themes, and menu preferences. Run `node tools/ui-smoke.cjs` after installing Playwright Chromium to repeat them locally. Native keyboard insets, microphone permission, stylus behavior, and downloads still need target-device testing.

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

## Added in 0.3.3

- Lowers the cursive “th” by 80 units in the 1024-unit artwork while keeping the shared-N layout and existing lettering scale.
- Fills the complete Android adaptive-icon background with the centre's same forest green, removing the cream surround visible in the owner's launcher screenshot. The launcher still chooses its outer shape. The themed asset uses the cursive lettering without a separate square plate.
- Preserves the previous cursive-square mark in `artwork/icon-options/cursive-square-0.3.2.svg` and `.png`. The updated comparison approximates the owner's rounded-square launcher mask.
- Carries forward the existing AI connection. Phone inference testing and daily-counter cleanup schedule confirmation remain pending.

## Verified 0.3.3 Android preview

The [0.3.3 workflow](https://github.com/bdredenbach/Nth-Nota/actions/runs/39248015008) passed all 38 checks and APK v2 signature verification. All 23 web assets match source; native code retains the same gateway address. The certificate matches 0.3.2 for normal in-place updates. The icon background now matches the centre's forest green throughout, with the th lowered. See [verification record](docs/android-build-verification-0.3.3.json). Phone AI testing and cleanup-trigger confirmation remain pending.
