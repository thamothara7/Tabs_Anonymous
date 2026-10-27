# Local conversations

Kokoro reads the dialogue. Qwen3 writes it through Ollama on this computer. The cast receives its tab topics, roles, fictional verdicts, and up to four recent conversation lines, so a witness can respond to the previous speaker. The therapist retains George's voice and a steady delivery. No audio configuration panel or cloud key is needed.

## macOS setup

Install Node and the project's dependencies first. Set `TA_EXTENSION_ID` in the ignored `.env` to your actual unpacked extension ID.

```sh
brew install ollama
npm run voice:setup
npm run local:start
npm run ai:setup
npm run build:extension
```

The AI setup downloads `qwen3:4b`, about 2.5 GB. Both services start at login and restart after an exit. These are user LaunchAgents named `com.tabsanonymous.voice` and `com.tabsanonymous.writer`. Logs are in ignored `artifacts/services/`. Re-run `local:start` after moving the project or changing the local backend. On Linux, run `ollama serve` with `OLLAMA_NO_CLOUD=1` and `npm run voice:server` in separate terminals, then `npm run ai:setup`.

Reload Tabs Anonymous in `brave://extensions` or `chrome://extensions`, then reload the therapy page. **Start therapy** enables the local writer. In a resumed session use **Enable AI dialogue**. **Sound off** enables Kokoro. Allow the optional localhost permission when prompted.

The compact status line says when the cast is improvising, when AI dialogue is active, or when scripted dialogue is continuing. Retry is available after a failure. Click **AI dialogue on** to switch back to scripted lines. There is no silent cloud fallback.

For only the Kokoro login service, use `npm run local:start -- --voice-only`; Ollama is not required for this mode.

To stop and remove both login services:

```sh
npm run local:stop
```

This leaves your model downloads and runtime installations intact. It does not stop unrelated Ollama installations.

## Limits and privacy

Replies target 10 to 22 words. During a regular story beat the next reply is prepared with the current generated line as context. Its Kokoro audio can also be prepared before the next cue. Promoting a prepared turn reuses the same request; interruptions discard speculative work. Generation takes a few seconds and depends on hardware; cold model loading takes longer. The first line and unplanned reactions may still need generation time. The writer model stays loaded for up to 30 minutes after use to reduce repeated cold starts. A small local model can misunderstand a topic or produce a weak joke. Its words never change browser state or fictional decisions. Page contents are never read. **Refresh cast and restart** updates the snapshot from currently open eligible tabs; there is no background scan.

Only bounded titles, domains, fictional character IDs, roles, duplicate relationships, audible flags, verdicts, and recent conversation are sent to localhost. Full URLs and native browser IDs are omitted. The managed Ollama service disables cloud features. Setup downloads models; actual dialogue stays local. Generated lines become part of session recovery and the text recap, which should be reviewed before sharing.

The speech connection fix also handles native extension fetches that omit Origin. The request must carry the exact configured extension ID. A present unrelated website Origin is rejected even if it supplies that header. This is not a security boundary against other software already running on the computer.

References: [Ollama generation API](https://docs.ollama.com/api/generate), [local-only mode](https://docs.ollama.com/faq), [Qwen3 model](https://ollama.com/library/qwen3:4b), [Chrome permission gestures](https://developer.chrome.com/docs/extensions/reference/api/permissions).
