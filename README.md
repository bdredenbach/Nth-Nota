# Nth Nota 0.2

An Nth Experience app for notes, sketches, tasks and ideas. Includes the offline browser editor and Android preview project. No paid AI service or cloud key is configured.

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
- Free-only AI router with tested task selection, provider/model quota scopes, retry cooldowns, context preservation, cancellation and privacy gating. No real engines are registered yet.
- Android project in android/ with bundled editor, native file pickers and chunked export, offline TTS and inexact reminders. The SDK is not available in the authoring environment: native source is uncompiled and untested. See android/BUILDING.md.

## Intentional prototype limits
No generative AI connection yet. The writing companion clearly marks this status; no generated answers are simulated. Android Gemini Nano, real cloud/local AI adapter connections, cursive-to-text, device verification of the prepared notification integration, background audio and cross-device sync are future work. No model picker or user API-key input is exposed. Local text-to-task conversion is labeled as a built-in tool, not AI.

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
