# Phase six: 20 October 2026 · v0.6.0

- Kokoro local speech is the default, with 13 bundled voice definitions, George reserved for the therapist, automatic personality-based assignment, separate saved casting, and eight preview delivery profiles.
- Reaction pacing, sentence pauses, bounded gain, emotion-aware audio caching, and playback-driven mouth animation. Kokoro has no direct emotion tags; actor-level performance is not promised.
- Isolated Python 3.12 setup, pinned runtime dependencies, predownloaded model/voices, enforced offline model loading, local-only transport, bounded work queue, and existing cancelable playback.
- Verification: 48 unit tests, 31 browser tests, and six real offline WAV samples. Browser decoding, non-silent unclipped signals, automatic casting, therapist separation, reaction changes, and cancellation are checked. Warm generation on the development Mac took about 0.8 to 1.4 seconds per test line.
- Original cloud and device engines remain explicit alternatives. No credentials or model files are committed.

## Phase five: 20 October 2026 · v0.5.0

- Five-chapter animated awards reel with verdict-specific jokes, an ending reveal, caption transcript, pause/replay, scrubbing, and chapter selection.
- Silent 1200×630 WebM export rendered locally from fictional artwork and aggregate counts. No screen capture, microphone, cloud calls, or browsing details.
- Reduced-motion preview/export, explicit export cancellation, hidden-tab cancellation, resource cleanup, and unsupported-browser fallback to existing cards.
- Verification: 46 unit tests and 29 browser tests (three intentional mobile skips), including private-metadata exclusion, real WebM encoding and decoding, desktop/mobile controls, and capture-track cleanup. Browser tests now use an isolated production preview so development-server reloads cannot disrupt a run.
- ElevenLabs live quality verification still requires the local API key; this phase does not change voice setup.

## Phase four: 19 October 2026 · v0.4.0

- Dedicated therapist casting, per-tab voice assignment, emotional ElevenLabs delivery, cancellable audio, playback-driven scene timing, and explicit local preview mode.
- Server-only API key, optional loopback permission, exact origin allowlist, request limits, bounded memory cache, and setup documentation.
- Larger session-aware dialogue pools avoid repeated punchlines across tabs and preserve memory on reload.
- Row-bounded character art and independent labels, prominent therapist host, original extension PNG icons at 16/32/48/128, and vector replacements for emoji. Authored runtime copy has no em dashes.
- Verification: 44 unit tests and 24 browser tests, including provider fixtures, native icon decoding, and desktop/mobile label collision checks. Two desktop-only cases are skipped on mobile.
- Real ElevenLabs quality verification is pending local API-key setup. Provider behavior is tested with fixtures, not live paid requests.

## Phase three : 19 October 2026 · v0.3.0

## Updated in this phase

- Replaced tiny overlapping balcony characters with a readable tray; reflowed the stage and isolated duplicate confrontations. Full titles can be expanded.
- Personal confessions and rotating roasts reference titles, known sites, duplicate matches, category counts, and verdict history. New meetings vary the dialogue seed.
- Added audible cue sequences, volume, Test sound, local English voice selection, and explicit fallback/error messaging. Pause/mute/dialog/scene changes cancel old speech.
- PNG award export plus SVG, preview, wrapped titles, two new endings, all-cast results even with zero kept, actual verdict buckets, and session highlights in the text recap.
- Added real Web Audio startup checks, mocked local-speech lifecycle tests, all-retired/reinstated/reload flows, PNG signature/dimension checks, and extension PNG download testing. Target-device physical audio remains a manual check.

## Previous phase

### Phase-two additions

- Voting beside the stage on desktop and in a fixed bottom dock on phones, with visible progress, Undo, next-undecided selection, and scoped keyboard controls (focus the panel: 1/2/3, N, Z).
- Event and design personalities, broader domain recognition, conservative title hints, full tab names with bounded visual labels, and a diverse 12-character cast that retains a real duplicate pair.
- Separate speaker and selection state: inspecting another tab no longer changes who delivers a pending line.
- Category-specific authored confessions, two-character duplicate confrontation, speaker-following pupils, microphone passes, chair landing reactions, ally movement, and secondary reactions.
- Reload checkpoints in the current tab's sessionStorage. Story recovery resumes paused at the beginning of its current beat; votes and Undo history survive. Versioned checkpoints reject stale or incompatible data.
- Real-mode restore requires existing permission and a fresh same-window scan. No grouping approval or operation is restored. Forget session clears the snapshot and game progress.
- A downloadable 1200×630 SVG award card without tab titles or URLs, alongside the detailed text recap.
- Native Chromium extension testing in a disposable profile using local fixture tabs. The test-only manifest pregrants permissions so native API behavior can be tested without OS-dialog automation; the distributed manifest retains optional permissions.

## Verification

- 40 unit tests and 18 browser tests pass (two desktop-only flows are skipped on mobile).

- TypeScript, deterministic core/director/classification/grouping/checkpoint tests.
- Desktop and mobile full demo, pause, dialogs, reload, Undo, keyboard controls, motion preference, and recap download flows.
- Desktop drag-and-drop after scrolling and mobile equivalent buttons.
- Actual native Chromium groups: canceled preview leaves groups unchanged; approved tabs receive the correct groups; pinned tabs stay outside them; all fixture tabs remain open; a changed URL blocks session recovery.
- Both production builds and screenshot review of the new voting layouts, duplicate confrontation, native group preview, and recap.

## Remaining work

1. Manually verify native permission grant/denial and browser-specific behavior in Chrome/Brave. Automated native tests pregrant permissions in an isolated profile; adapter tests cover grouping failures and stale data.
2. Publish a public zero-permission demo. The repository is private; no external hosting is configured.
3. Exact shared-element tab-strip breakout, richer chair physics, additional comedic timing, full session replay, and submission recording.
4. Side-panel launcher, extension icons/store submission, and exhaustive accessibility/performance audits.
5. Confirm hackathon eligibility/deadline independently.

The original specification is retained unchanged. This file describes implemented behavior, not completion of every roadmap item.
