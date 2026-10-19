# Privacy and permissions

The demo uses authored fictional tabs. There is no account, analytics, backend, AI request, page scraping, or remote font dependency. A reduced-motion preference is stored in localStorage.

Game progress is saved in the current browser tab's **sessionStorage**. In real-tabs mode this includes the snapshot's tab titles and URLs plus fictional choices and relationships. It stays on this device; it is never uploaded. Checkpoints older than 24 hours are rejected on restore. Restart clears game progress. **Forget session** in the extension banner clears both the saved snapshot and game progress and returns to the launcher. A browser may restore sessionStorage when restoring a closed tab, so use Forget session to explicitly remove it.

The optional extension requests `tabs` and `tabGroups` only after **Connect this window**. It reads eligible tab titles, URLs, pinned status, audible status, IDs, and window IDs. It does not read page contents or browsing history, inject scripts, or send data to a server. Reload recovery first checks that permission still exists and verifies the saved snapshot against a fresh query in the same window. Changed, closed, protected, or moved tabs require a new connection.

Pinned, incognito, internal, and currently navigating tabs are excluded. Up to 12 representatives animate, selected across categories while retaining one duplicate pair. Larger snapshots remain available for the separate grouping preview. Native grouping may alter existing tab groups but is performed only for selected tabs after an explicit Apply. Canceling a preview performs no browser mutation. Grouping approvals are never stored or automatically replayed after reload.

“Retire from arena” and Undo affect fictional game state only. No code path invokes the Chrome tab removal API.

The **SVG recap card** excludes tab names, URLs, IDs, and browsing categories. It contains a fictional award and aggregate game counts. The separate **text recap** includes character names and fictional choices; in real mode those names can contain tab titles. Review that file before sharing it. Permission can be revoked through the browser's extension settings or by removing the extension.
