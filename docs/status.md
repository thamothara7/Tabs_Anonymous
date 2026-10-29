# Private submission materials: 29 October 2026

- Recorded and reviewed a 79-second Full HD walkthrough of actual scripted gameplay and a disposable native grouping preview, with local Kokoro narration and subtitles.
- Added a reproducible recorder and local private handoff ZIP. Verified full-file decoding, Chromium playback/seeking, and non-clipped narration.
- Public demo, repository visibility, and video publication remain on hold at the owner's explicit request. Nothing was submitted to Devpost.
- Updated organizer rules and date-display differences in the [readiness checklist](submission-readiness.md).

## Submission audit: 27 October 2026 · v0.9.1

- Fixed stale AI dialogue after Undo, including rejection of late replies based on the old verdict.
- Fixed voting progress highlighting and added an accessible current-step indicator.
- Fixed standalone Kokoro service startup and validated prerequisites before stopping running services.
- Verification: 59 unit tests, 38 browser tests, four intentional skips, both production builds, six real Kokoro samples, and a real local AI response.
- Added reviewed implementation-based Devpost copy and a [submission readiness checklist](submission-readiness.md). Public access, presentation recording, native permission prompts, physical audio, and organizer eligibility/deadline confirmation remain explicit release tasks.

## Phase nine: 22 October 2026 · v0.9.0

- Prepare the next AI reply and Kokoro audio while the current character speaks. Reuse prepared requests, cancel stale work, shorten replies and speech pauses, and reduce silent reading delays.
- Upgrade the cast with shaded shells, rim highlights, richer eyes, asymmetric expressions, and category details. Rebuild the awards stage with lighting, a podium, and clearer export controls.
- Replace SVG sharing with a 2400×1350 PNG card and matching PNG preview. Text recaps include full titles, verdict counts, deduplicated AI dialogue, and explicit link omission.
- Full HD 1920×1080 video export, H.264 MP4 when supported, WebM fallback, target 30 fps and 12 Mbps. Silent 15-second film; no screen capture or browsing details.
- A warm real-model browser run measured 42 ms and 20 ms between prepared speakers; first-load and interruption latency can be higher. A downloaded MP4 was independently identified as H.264, 1920×1080, with a 15-second duration.
- Verification: 58 unit tests and 36 browser tests passed, with four intentional mobile skips. The final MP4 has approximately 30 fps at 1920×1080. Coverage includes prepared-request reuse, cancellation, full-title recap privacy, PNG decoding, native extension downloads, and real MP4 decoding and seeking.

## Phase eight: 21 October 2026 · v0.8.0

- Fixed native extension speech requests without an Origin header. Exact configured extension identity is accepted; unrelated website origins remain blocked. Permission is requested inside the user gesture and failures show the underlying cause.
- Local Qwen3 conversations use tab topics, personalities, verdicts, and previous speakers. The therapist mediates; tabs answer each other through existing microphone, roast, and witness interactions. Generated captions are read by the existing distinct Kokoro cast. AI failures explicitly continue scripted dialogue with Retry.
- Canceled or stale generations cannot replace a newer turn. Generation pauses the scene clock; recorded replies become subsequent context and session highlights.
- macOS login services keep Kokoro and the local writer available, with an explicit uninstall command. No cloud API or key is needed.
- Verification: 55 unit tests and 34 browser tests passed, with four intentional mobile skips. Native extension transport, desktop/mobile conversation, stale replies, and interruption paths are covered. Real local AI replies were decoded and played in Chromium using George (7.995 seconds) and Bella (7.545 seconds); pause stopped playback while keeping captions visible. Physical speaker quality still needs a device check. See [local AI setup](ai.md).

## Phase seven: 20 October 2026 · v0.7.0

- Removed Audio settings, manual casting, voice previews, engine selection, cloud routes, and browser synthesis. One Sound toggle connects to Kokoro, with a cancelable warmup and compact retry status. George is always the therapist and twelve distinct tab voices are assigned automatically; old overrides are ignored.
- Dialogue now incorporates bounded title topics, related tabs, domain counts, duplicates, audible status, prior defense, and verdicts. Local authored templates remain the writing engine, with no page reading or language-model inference.
- **Call a witness** lets another character testify about the selected tab. Relevant peers speak first, repeat calls rotate peers and testimony, and the witness uses its own voice and skeptical delivery. The defendant stays selected.
- **Refresh cast and restart** reads currently open eligible tabs into a new session. Failed refresh preserves the existing session. Actual tabs and groups are not changed by refreshing.
- Fixed scene-clock synchronization when a new reaction interrupts speech; long playback cannot advance the story early. Pause, mute, cancellation, late readiness responses, and errors remain covered.
- Verification: 50 unit tests, 27 browser tests with three intentional mobile skips, both production builds, and six real Kokoro WAV samples. An additional real Chromium playback check decoded and played George's 15.955-second host line and a separate 16.505-second witness line, then verified pause. Physical speaker quality is not an automated test.
- The local service was restarted and warmed with the configured extension origin. The build is ready in `dist-extension/` and the ZIP in `artifacts/`. Reload the extension in Brave to use v0.7.0.

## Earlier releases

## Phase six: 20 October 2026 · v0.6.0

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
4. Side-panel launcher, store submission, and exhaustive accessibility/performance audits.
5. Confirm hackathon eligibility/deadline independently.

The original specification is retained unchanged. This file describes implemented behavior, not completion of every roadmap item.
