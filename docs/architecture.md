# Architecture

```mermaid
flowchart TD
  Demo[Mock tab fixture] --> Core[Pure game reducer]
  Consent[Optional Chrome permission] --> Snapshot[Current-window metadata]
  Snapshot --> Cast[At most 12 characters]
  Cast --> Core
  Core --> Director[Animation director]
  Director --> UI[SVG characters and React arena]
  UI --> Choices[Defend / challenge / fate]
  Choices --> Core
  Core --> Awards[Fictional awards and recap]
  Snapshot --> Preview[Exact grouping preview]
  Preview --> Approval[Explicit per-tab approval and Apply]
  Approval --> Rescan[Check current URL / window / eligibility]
  Rescan --> Chrome[Native groups]
```

## Logical state

`GameState` owns phase, beat index, character facts and relationships, selected character, interventions, decisions, and history. No Chrome globals are imported into `game-core`. The deterministic story deck uses the same snapshot and seed on every run. Exact-URL duplicate detection preserves the query string; fragments are ignored. Classification matches domain boundaries, never arbitrary substrings.

`NEXT` advances one story beat and applies its effects. Further `NEXT` events outside the playing phase do nothing. The finale requires a decision for every character and enforces at most six kept characters. Defend/Challenge affect clamped trust and confidence; defending and later retiring a tab enables the Betrayer ending. Reset reconstructs the original cast with the next dialogue seed. New browser sessions receive a time-based seed; explicit seeds remain deterministic.

## Animation ownership

One `AnimationDirector` owns the active story clock or a short player interruption. Pause freezes elapsed time and CSS animations. Skip cancels the active clock and resolves one completion. Unmount cancels callbacks. An interruption temporarily replaces the caption and then restarts the interrupted story beat without replaying its reducer effects.

SVG rigs keep body, shadow, limbs, pupils, brows, and mouth separate. CSS supplies movement and facial changes. Motion provides pointer dragging, with page-to-viewport coordinate conversion for drop detection on scrolled pages. Reduced motion disables CSS loops, entrances, projectiles, and dragging; identical outcomes remain available through buttons.

## Extension boundary

The MV3 action opens an extension document. All authoritative state stays in that visible document, so no persistent service worker is needed. Permissions are requested only from the Connect button. Snapshots remain on-device, and no page bodies, history, or content scripts are used. The optional speech bridge has a separately requested loopback host permission; spoken lines may contain titles.

A complete preflight runs before the first approved mutation. Every group is checked again immediately before its call. URLs, window, pinned/private status, and pending navigation are checked against the original snapshot. Chrome operations are inherently non-atomic: a tab could change between the final check and Chrome's operation, or later operations can fail. Successful group calls are recorded before naming, ensuring a naming failure does not hide an already-created group. On failure the loop stops and tells the user which groups succeeded. Reload to refresh before retrying.

The extension is not allowed in incognito windows. Internal URLs are ineligible. Pinned tabs are excluded entirely from the real cast in this MVP. Group preview decisions are deliberately independent of fictional votes and require a separate explicit approval.

## Phase-two state and recovery

`actionTarget` owns the current speaker independently of `selected`, so selecting another character cannot redirect an in-progress intervention. An Undo stack stores the previous fate and emotion for each verdict; replaying the same verdict is a no-op. Undo is only available before results.

`featuredTabs` preserves one duplicate pair, samples each present category, then fills remaining seats in stable order. Exact domains take precedence over conservative local title hints; no page bodies or history are read. Full titles remain available while CSS bounds labels.

Versioned sessionStorage checkpoints are validated against the current cast before hydration. Only logical game state is restored; transient speech, grouping approvals, and browser operations are never resumed. Story scenes restart paused at their current beat. The extension first checks existing permissions and reconstructs snapshot facts from a fresh same-window scan. Any saved tab that moved, closed, navigated, or became protected invalidates that snapshot. Browser-managed tab restoration can retain sessionStorage, so the extension offers an explicit Forget session action.

The SVG recap is generated locally from the fictional ending and aggregate fate counts; it deliberately excludes tab titles, URLs, IDs, and categories. The separate text recap keeps the detailed character list.

## Phase-three presentation and audio

The stage reflows the remaining cast and moves retired characters to a horizontally scrollable, selectable tray. Duplicate scenes give the arguing pair their own space. The results list reflects actual keep/group/retire verdicts, including empty buckets, and shows recent dialogue highlights. Bounded history and the dialogue variation counter survive reload.

Dialogue combines bounded titles, title topics, domain counts, shared-topic peers, category variants, duplicates, and prior game choices. `ROAST` uses the same single reaction clock as other interventions. No live page content or external generation is used.

`SessionAudio` unlocks Web Audio on an explicit gesture, schedules cue-specific notes with gain envelopes, and releases nodes on completion. Speech uses Kokoro only. Muting, pausing, opening a dialog, advancing, and unmounting cancel the old speech. Resuming with voices restarts the current sentence and its timer; without voices it resumes elapsed time. Sound remains optional; failures turn it off and keep captions available.

PNG export rasterizes the self-contained SVG locally at 1200×630. Both formats use only generic artwork, an ending, and aggregate counts. Long award names wrap onto two lines. Text export and on-screen highlights include titles and dialogue; native browser grouping remains separate.

## Phase-four speech boundary

The client casts one Kokoro voice per actor and reserves George for the therapist. The localhost server has no cloud routes. The client aborts obsolete fetches, stops the previous audio element, revokes object URLs, and guards completion callbacks with a generation counter. Scenes wait for playback completion. A separate abortable readiness request validates the 13-voice catalog before enabling sound; startup can be canceled. Old manual maps cannot override casting.
Character labels have fixed row space independent of the artwork. Dialogue selection filters recently used punchlines across the cast, with bounded history restored from checkpoints. The extension icons rasterize the existing SVG brand mark; generated PNG assets are committed and packaged without needing browser automation during a normal build.

## Phase five: animated recap

`createReel` projects game state into aggregate counts and authored strings, excluding all tab metadata and history. One deterministic canvas renderer powers a React preview and a separate offscreen recording canvas. The preview starts paused and exposes chapter buttons, a timeline, and captions outside the canvas. A local MediaRecorder captures only the generated canvas at 30 fps. Abort, hidden-tab, unmount, recorder error, and timeout paths stop capture tracks and release animation frames. No new permission or dependency is required.

## Phase six: local Kokoro speech

`/kokoro/voices` and `/kokoro/speech` use a loopback server with exact origin checks and optional extension host permission. A lazy persistent Python worker owns one model shared between US and UK English pipelines. Typed JSON requests use a bounded queue; canceled requests retain their inference slot until the worker finishes. Runtime forces offline model loading. Server shutdown terminates the worker. Reaction emotion is passed separately from stable voice identity.

## Phase seven: contextual conversation

`context.ts` extracts bounded title words and ranks peers by duplicate address, shared title topics, same domain, then category. `dialogue.ts` turns that evidence into local authored confession, roast, and witness lines. Recent history filters repeated lines; there is no external text model or page-body reading. Topic matching is lexical, not semantic understanding.

`WITNESS` preserves the selected defendant while setting `actionTarget` to the witness. The witness receives a skeptical expression and speaks in its own voice. Repeat calls rotate through peers; testimony incorporates the defendant's verdict or prior defense. The same cancellable reaction clock and bounded history apply. Single-character casts disable the action.

The extension's **Refresh cast and restart** explicitly takes a new snapshot, clears the previous game checkpoint, and remounts the shared App with the fresh cast. A failed refresh retains the old session and displays the error. Actual browser groups remain independent and untouched by this action.

## Phase eight: local conversation writer

`useDialogue` captures metadata and the latest six history lines once per turn, requests a bounded response, and caches it by session, phase, beat, reaction serial, and speaker. Changing the inspected dossier does not change the speaker. AI waiting pauses the director and speech; when ready, the generated line becomes both caption and speech. Skip, interruption, pause, and unmount abort obsolete requests. Reducer guards reject responses for old turns. Generated emotions change delivery, never the verdict.

`/dialogue` accepts a validated cast of at most 12 and delegates only to `127.0.0.1:11434` with the fixed `qwen3:4b` model, structured JSON output, no thinking, bounded context, and one active generation. Titles and history are untrusted data. Output length, emotion, and repeated lines are checked. AI failures explicitly switch to scripted dialogue with Retry; no cloud fallback exists.

Native extension requests may omit Origin. The transport includes the runtime extension ID; absent-Origin requests must match the configured extension exactly. Requests with a website Origin still require the origin allowlist. User-gesture permission ordering is preserved. A native Chromium integration test covers the real header behavior; normal UI tests isolate the writer from locally installed models.

On macOS, `local:start` registers two user launch agents: the loopback voice backend and an Ollama server with cloud disabled. Both run at login and restart on exit. `local:stop` removes only these agents. Models and runtimes remain independently installed.
