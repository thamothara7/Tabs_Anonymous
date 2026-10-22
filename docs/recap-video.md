# Awards and exports

Finish all verdicts and open **The awards ceremony**. The ceremony features the selected cast, a spotlighted podium, and the actual verdict counts. Export buttons sit directly below it.

- **Save PNG card** creates a 2400×1350 image with a matching PNG preview. It contains an authored award, fictional characters, and counts. No SVG download or conversion is needed.
- **Save text recap** includes full tab titles, roles, final verdicts, and recent dialogue, including AI-written replies. Duplicate lines are removed and explicit links are omitted. This file includes browsing titles, so review it before sharing.
- **Play reel** previews five chapters over 15 seconds. Pause, restart, chapter selection, and a timeline are available.
- **Save video** creates a 1920×1080 film. H.264 MP4 is preferred when the browser supports it; WebM VP9/VP8 is the fallback. The filename follows the actual format. The recorder requests 30 fps and 12 Mbps; actual frame rate and bitrate depend on hardware and browser encoding. The export remains silent and captioned.
- **Minimal motion** removes entrances, bobbing, rotation, and falling confetti. Chapter cuts and the progress indicator remain.
- Keep the tab visible during export. Cancel, switching away, or leaving the results stops recording and discards the partial film. Browsers without a supported recorder retain PNG downloads and the preview.

The image/video renderer receives only aggregate verdict counts and authored award copy. It never receives tab names, URLs, IDs, session dialogue, or voice recordings. Up to five fictional representatives appear; the counts reflect the entire cast. These exports render a generated canvas and upload nothing. Character art is cached at 2× resolution so animation does not redraw every detail on every frame.

The browser tests save `artifacts/recap-film.mp4` or `.webm`, decode the file, verify 1920×1080 dimensions, and seek to the last chapter. PNG tests check the signature and 2400×1350 dimensions. Native extension downloads, desktop/mobile controls, and stopped capture tracks after cancellation are covered.

References: [MediaRecorder format detection](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static), [recording MIME types](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/mimeType), [actual recording bitrate](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/videoBitsPerSecond).
