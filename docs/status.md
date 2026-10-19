# Phase two — 19 October 2026 · v0.2.0

## Added in this phase

- Voting beside the stage on desktop and in a fixed bottom dock on phones, with visible progress, Undo, next-undecided selection, and scoped keyboard controls (focus the panel: 1/2/3, N, Z).
- Event and design personalities, broader domain recognition, conservative title hints, full tab names with bounded visual labels, and a diverse 12-character cast that retains a real duplicate pair.
- Separate speaker and selection state: inspecting another tab no longer changes who delivers a pending line.
- Category-specific authored confessions, two-character duplicate confrontation, speaker-following pupils, microphone passes, chair landing reactions, ally movement, and secondary reactions.
- Reload checkpoints in the current tab's sessionStorage. Story recovery resumes paused at the beginning of its current beat; votes and Undo history survive. Versioned checkpoints reject stale or incompatible data.
- Real-mode restore requires existing permission and a fresh same-window scan. No grouping approval or operation is restored. Forget session clears the snapshot and game progress.
- A downloadable 1200×630 SVG award card without tab titles or URLs, alongside the detailed text recap.
- Native Chromium extension testing in a disposable profile using local fixture tabs. The test-only manifest pregrants permissions so native API behavior can be tested without OS-dialog automation; the distributed manifest retains optional permissions.

## Verification

- TypeScript, deterministic core/director/classification/grouping/checkpoint tests.
- Desktop and mobile full demo, pause, dialogs, reload, Undo, keyboard controls, motion preference, and recap download flows.
- Desktop drag-and-drop after scrolling and mobile equivalent buttons.
- Actual native Chromium groups: canceled preview leaves groups unchanged; approved tabs receive the correct groups; pinned tabs stay outside them; all fixture tabs remain open; a changed URL blocks session recovery.
- Both production builds and screenshot review of the new voting layouts, duplicate confrontation, native group preview, and recap.

## Remaining work

1. Manually verify native permission grant/denial and browser-specific behavior in Chrome/Brave. Automated native tests pregrant permissions in an isolated profile; adapter tests cover grouping failures and stale data.
2. Publish a public zero-permission demo. The repository is private; no external hosting is configured.
3. Exact shared-element tab-strip breakout, richer chair physics, additional comedic timing, animated video recap, and submission recording.
4. Side-panel launcher, extension icons/store submission, and exhaustive accessibility/performance audits.
5. Confirm hackathon eligibility/deadline independently.

The original specification is retained unchanged. This file describes implemented behavior, not completion of every roadmap item.
