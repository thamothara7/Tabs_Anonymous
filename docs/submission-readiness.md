# Submission readiness: 27 October 2026

The v0.9.1 local build is ready for a rehearsed demonstration. The complete submission package is not ready to publish yet.

## Pumpkin Playground rules

Checked the official [overview](https://pumpkin-playground.devpost.com/) and [rules](https://pumpkin-playground.devpost.com/rules) on 27 October 2026:

- The page header displays November 5, 2026 at 11:45am EST.
- The overview requirements and written rules still list October 23 as the submission end date.
- Judging eligibility requires California State University, Long Beach enrollment, with proof checked by the organizer.

Do not assume the header supersedes the written rules. Confirm the applicable deadline and eligibility with ACM Long Beach. No organizer message or project submission has been sent. The rules allow a working or nonworking project; the presentation checklist below is our quality bar, not an invented organizer requirement.

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
2. Make the source available to judges through an approved public repository or shared source archive. The current repository is private.
3. Deploy the static `dist/` demo and open the public URL in a clean browser. Captioned play works without local services. AI and sound require the local setup; a hosted demo must not imply that they work for every visitor.
4. Record and review a 60 to 90 second project walkthrough. Use fictional tabs to avoid exposing browsing details. Show gameplay and the real grouping preview separately. The 15-second in-app film is an export feature, not the walkthrough.
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
