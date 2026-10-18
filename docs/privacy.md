# Privacy and permissions

The demo uses only authored fictional tabs. There is no account, analytics, backend, AI request, or remote font dependency. A reduced-motion preference is stored in localStorage. No session history is persisted.

The optional extension requests `tabs` and `tabGroups` only after **Connect this window**. It reads eligible tab titles, URLs, pinned status, audible status, IDs, and window IDs. Those facts are processed in memory in the extension document. It does not read page contents or browsing history, inject scripts, or send data to a server.

Pinned, incognito, internal, and currently navigating tabs are excluded. At most 12 characters animate; larger snapshots remain available for the separate local grouping preview. Native grouping may alter existing tab groups but is performed only for selected tabs after an explicit Apply. Canceling a preview performs no browser mutation.

“Retire from arena” changes fictional game state only. No code path invokes the Chrome tab removal API.

A downloaded recap includes character names and fictional choices. In real-tabs mode those names can contain tab titles, so review the file before sharing it. Permission can be revoked through Chrome's extension settings or by removing the extension. Reloading the arena clears its in-memory session.
