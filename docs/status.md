# First playable build — 18 October 2026

## Implemented

- React/TypeScript/Vite demo with twelve mock tabs and a complete three-round story.
- SVG rigs, six category styles, eight facial states, sound-off captions, and state-driven reactions.
- Entrances, duplicate standoff/stamp, alliance state, popcorn prop knockdown, victory, grouping, and retirement reactions.
- Character dossier, microphone/defend/challenge, six-keep limit, reversible fate decisions, endings, and text recap.
- One animation director with pause, resume, skip, cancellation, and player interruptions.
- Responsive layouts, native modal focus handling, accessible controls, reduced motion, and optional Web Audio cues.
- Locally bundled fonts and zero required external runtime services.
- Native MV3 extension bundle with optional permission, protected-tab exclusions, grouping preview, stale-snapshot checks, and truthful partial errors.
- CI and reproducible npm lockfile.

## Verification

- TypeScript check.
- Unit coverage for deterministic replay, exact duplicates, domain boundaries, vote completion and limits, relationship consequences, protected-tab filtering, 200-tab classification, consent/cancel boundaries, stale tabs, and partial grouping failure.
- Director coverage for paused clocks, resumed clocks, single completion, and cancellation.
- Desktop and mobile Chromium flows through the full demo, awards and recap download, privacy dialogs, pause, and persisted motion preference.
- Desktop drag-and-drop after scrolling. Mobile drag is not asserted; equivalent button choices are covered.
- Both demo and extension production builds.
- Desktop and mobile screenshot review, with no page-level errors in the completed demo flow.

## Remaining work

1. Install the extension in a user-approved Chrome test profile and manually verify the actual native permission dialog and native tab groups. Current adapter safety coverage uses mocks.
2. Publish a public zero-permission demo. The Git repository is private by default; no external hosting has been configured.
3. Shared-element tab-strip breakout, richer ally relocation, microphone toss, proper chair physics, more timing polish, and an animated/shareable image recap.
4. Session checkpoint/resume, side-panel launcher, extension icons/store submission, and exhaustive browser accessibility/performance audits.
5. Record the submission video and confirm hackathon eligibility/deadline independently.

The original build specification is retained unchanged. This document describes the shipped implementation, not a claim that every roadmap item is finished.
