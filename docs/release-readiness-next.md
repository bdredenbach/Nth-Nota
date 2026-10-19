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

## Writing companion scope and ambiguity

- Prepared in source after the 0.6.0 APK: shared prompts keep both local and cloud
  replies focused on writing, notes, tasks, planning, and Nth Nota workspaces.
- Chat and drafting should ask one short clarification when a missing goal cannot
  be resolved from the current note and conversation. They should not invent the
  rest of an unfinished request or default to promoting other tools.
- Preserve arbitrary note subjects: the purpose of the assistance, rather than
  the subject of the writing, is what keeps the response in scope.
- Suggestions do not execute app actions. Never claim a note, task, reminder, or
  workspace change has happened unless the app has actually performed it.
- Real-model acceptance checks for the next APK: unfinished idea-board request
  asks its purpose; a follow-up answering that purpose produces useful note/card
  suggestions without repeating the question; explicit requests for external-tool
  comparisons remain allowed; proofreading an incomplete sentence still returns
  corrected text, without switching into a planning interview.
- Prompt guidance is not a guaranteed semantic validator. Verify these cases on
  both the device model and enabled cloud providers before declaring them passed.

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
