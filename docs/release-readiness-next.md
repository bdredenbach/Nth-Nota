# Next milestone after the 0.6.0 audio device test

Approved scope, October 19, 2026. Ship the audio test APK first; verify microphone
recording, playback, transcription quality, and cancellation on the phone before
implementing this milestone.

## Guided first use and permission choices

- Add an Nth Experience tutorial introducing notes, movable windows, tasks,
  recording, transcription, and the writing companion.
- Skip tutorial skips the feature tour and opens the permission and consent
  choices. It does not grant permissions or accept cloud processing.
- Explain microphone access and notification access before requesting them.
  Each is optional, requested independently, and can be revisited in Settings.
- Keep local writing AI automatic. Ask explicitly before the first cloud request;
  explain that the request, selected text or current note context, and recent chat
  can go to Cloudflare and configured Groq. After consent, fallback is automatic.
- Declining or leaving a choice must keep the corresponding permission/consent
  ungranted. Core notes remain usable.
- Allow the tutorial to be replayed from Settings.

## Task reminders and ongoing notifications

- Let users choose which tasks should notify them, with an optional time.
- Offer an optional persistent/ongoing task notification with clear controls to
  complete the task or stop showing it. Respect notification permission, channel
  preferences, and Android's dismissal/background restrictions.
- Reconcile reminders and notifications when a task changes, completes, is
  deleted, or is restored; avoid duplicate alerts.
- Request only the permissions needed for the reminder behavior actually chosen.

## Public-release readiness

- Publish an accurate privacy policy and link it in the app and store listing.
- Review provider retention, logging, SDK behavior, and Data safety declarations.
- Add in-app reporting for AI replies and review generation safeguards.
- Add Privacy & data controls and review export and deletion behavior.
- Review the shared cloud allowance and clear quota/unavailable messages.
- Expand capability checks and graceful fallback beyond Pixel devices.
- Check large text, TalkBack, contrast, touch targets, small screens, tablets,
  foldables, landscape, keyboard insets, localization, and right-to-left layouts.
- Test on additional manufacturers and older/lower-memory devices. Do not claim
  tested device coverage based solely on configured minimum Android versions.
