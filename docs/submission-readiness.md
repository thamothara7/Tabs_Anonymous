# Submission readiness: 29 October 2026

The v0.9.1 local build is ready for a rehearsed demonstration. A narrated walkthrough and private handoff package are now prepared. Public access remains intentionally disabled at the owner's request.

## Pumpkin Playground rules

Checked the official [rules](https://pumpkin-playground.devpost.com/rules) and [schedule](https://pumpkin-playground.devpost.com/details/dates) on 29 October 2026:

- Written rules now list submissions from October 27 through November 5.
- The rules-page header displays November 6 at 3:00am EST, while the fetched schedule displays November 5 at 11:45am EST. Confirm the exact cutoff with the organizer; do not assume the later display applies.
- CSULB enrollment is required for judging and prizes, with proof checked by the organizer. The rules now say all projects are eligible for social promotion.

No organizer message or project submission has been sent. The rules allow a working or nonworking project; our presentation checklist is a quality bar rather than an additional organizer requirement.

## Private presentation materials

- `artifacts/submission/tabs-anonymous-walkthrough.mp4`: 78.8 seconds, 1920×1080 H.264 with AAC Kokoro narration and visible captions.
- `artifacts/submission/walkthrough.srt`: matching subtitle file.
- `artifacts/submission/tabs-anonymous-private-submission-kit.zip`: video, subtitles, builds, source archive, narrative, and this checklist.
- Reproduce the recording with `node scripts/record-walkthrough.mjs` after both builds, Playwright Chromium, ffmpeg, and the local Kokoro service are available.

The walkthrough records actual interface interactions using fictional tabs and scripted gameplay. The voiceover is separately generated local Kokoro narration. Native grouping is shown in a disposable Chromium profile with two fixture tabs and pregranted permissions, not the owner's browser. The footage shows the approval preview; it does not claim to demonstrate the native permission prompt. No real browsing data is recorded.

Verification: reviewed a contact sheet across seven chapters; decoded the complete MP4 with ffmpeg; played and sought to 70 seconds in Chromium; confirmed 1920×1080 dimensions and a 78.8-second duration. Narration peak is -2.2 dBFS, with no detected clipping. Physical playback still needs review on the presentation device. No source, build, or video was made public.

## Verified locally

- 59 unit tests; 38 browser tests, with four intentional mobile skips.
- Production web and extension builds, PNG dimensions, playable Full HD video, and text recap exports.
- Complete desktop/mobile game, pause, interruption, verdict Undo, recovery, and approved native grouping in a disposable Chromium profile.
- Undo now invalidates old AI replies and requests dialogue using restored verdicts. Voting progress correctly selects The verdict and exposes the current step to assistive technology.
- Local Kokoro: 13 voices and six actual generated WAV samples. Local Qwen3: a real successful dialogue request using fictional fixture topics.
- Voice-only login startup no longer requires Ollama. Prerequisites are checked before stopping existing services.

Automated audio generation does not prove physical speaker output. Native browser tests use pregranted permissions; the real Chrome/Brave permission prompt still needs a manual allow/deny check.

## Before publishing

1. Confirm the organizer's deadline and your judging eligibility.
2. Decide how judges will receive access when ready. The owner requested that everything stay private for now; the repository remains private and the handoff ZIP is local.
3. Deploy the static `dist/` demo and open the public URL in a clean browser. Captioned play works without local services. AI and sound require the local setup; a hosted demo must not imply that they work for every visitor.
4. Review the prepared 79-second walkthrough on the presentation device, then supply it through an approved sharing method. The 15-second in-app film remains a separate export feature.
5. On the presentation device, reload the extension, check the native permission grant and denial flows, hear the therapist and a tab through the actual speakers, and rehearse once from a clean session.
6. Paste the reviewed [Devpost narrative](devpost-submission.md), add screenshots and accessible links, and submit before the confirmed cutoff.

## Quick judge demo

```sh
npm ci
npm run build
npm run preview
```

Open http://127.0.0.1:4173. Click Start therapy. If local AI is unavailable, scripted captions continue. Use Skip scene to reach the vote, assign every tab a verdict, and open the awards. No API key or browser permissions are needed for fictional captioned play.

For local speech and AI, follow [voices](voices.md) and [local conversations](ai.md). Install the extension from the generated ZIP or `dist-extension/` only if demonstrating real tab integration.

## 75-second walkthrough plan

| Time   | Show                                            | Narration or caption                                              |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------- |
| 0–8s   | Fictional cast entering                         | Your browser tabs have formed a support group.                    |
| 8–22s  | Therapist and two different tab voices          | The therapist leads. Every tab has an excuse and its own voice.   |
| 22–35s | Duplicate confrontation; call a witness         | They know who else is in the room. Sometimes they bring receipts. |
| 35–49s | Keep, group, retire, and Undo                   | You choose their fictional fate. Real tabs stay open.             |
| 49–61s | Award screen, PNG and video preview             | The meeting ends with an award and a locally rendered recap.      |
| 61–70s | Native grouping preview using safe fixture tabs | Real organization happens only after you review and apply it.     |
| 70–75s | Title and accessible demo link                  | Tabs Anonymous. One tab at a time.                                |

Keep captions visible. Avoid filming private titles, environment files, or account details. Describe Kokoro emotion as reaction-aware pacing and delivery, not actor-level emotional control.
