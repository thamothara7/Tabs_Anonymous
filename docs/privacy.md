# Privacy and permissions

The demo uses authored fictional tabs. The base game has no account, analytics, page scraping, or remote font dependency. Kokoro is the only speech engine and generates speech locally after a one-time model download. A reduced-motion preference is stored in localStorage.

Game progress is saved in the current browser tab's **sessionStorage**. In real-tabs mode this includes the snapshot's tab titles and URLs plus fictional choices and relationships. It stays on this device; it is not uploaded as a snapshot. Dialogue and speech stay on this computer. Checkpoints older than 24 hours are rejected on restore. Restart clears game progress. **Forget session** in the extension banner clears both the saved snapshot and game progress and returns to the launcher. A browser may restore sessionStorage when restoring a closed tab, so use Forget session to explicitly remove it.

The optional extension requests `tabs` and `tabGroups` only after **Connect this window**. It reads eligible tab titles, URLs, pinned status, audible status, IDs, and window IDs. It does not read page contents or browsing history, inject scripts, or send snapshots to a server. Enabling sound sends individual lines to Kokoro on localhost. Reload recovery first checks that permission still exists and verifies the saved snapshot against a fresh query in the same window. Changed, closed, protected, or moved tabs require a new connection.

Pinned, incognito, internal, and currently navigating tabs are excluded. Up to 12 representatives animate, selected across categories while retaining one duplicate pair. Larger snapshots remain available for the separate grouping preview. Native grouping may alter existing tab groups but is performed only for selected tabs after an explicit Apply. Canceling a preview performs no browser mutation. Grouping approvals are never stored or automatically replayed after reload.

“Retire from arena” and Undo affect fictional game state only. No code path invokes the Chrome tab removal API.

The **PNG / SVG recap card** and **animated WebM reel** exclude tab names, URLs, IDs, and browsing categories. They contain fictional artwork, an authored award, and aggregate game counts. Video is rendered locally from a generated canvas, with no screen or microphone recording and no upload. The separate **text recap** includes character names, fictional choices, and recent session dialogue; in real mode those names can contain tab titles. Review that file before sharing it. Permission can be revoked through the browser's extension settings or by removing the extension.

Kokoro runtime uses offline model loading. Setup downloads dependencies and model files without tab data. The app no longer stores voice preferences and ignores old manual casting. Speech audio is cached only in bounded server memory; restarting the server clears it.

Sound is off on entry. Enabling it requests optional access to `http://127.0.0.1/*`, checks Kokoro readiness, and enables local speech. There are no cloud speech routes or browser speech fallbacks. No API key is used. See [voice setup](voices.md).

Dialogue uses authored templates filled with title words, domains, shared topics, duplicates, audible status, and fictional decisions. It does not use a language model or read page content. **Call a witness** uses that same metadata. **Refresh cast and restart** explicitly reads the current window again and replaces the saved snapshot and fictional game progress. No continuous background scanning is performed.
