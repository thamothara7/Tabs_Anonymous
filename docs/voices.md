# Local voice setup

Kokoro is the default speech engine. It runs on your computer through the local Node server and a persistent Python worker. No API key or cloud speech service is required.

1. Install [uv](https://docs.astral.sh/uv/getting-started/installation/) if needed, then run `npm run voice:setup`. This downloads Python 3.12, dependencies, the Kokoro model, and 13 English voices. Setup needs internet and roughly 1.5 GB of disk space. It does not send tab data.
2. For the extension, set `TA_EXTENSION_ID` in the Git-ignored `.env` to the ID from `brave://extensions`. No ElevenLabs key is needed. The web demo requires no environment configuration.
3. Run `npm run voice:server` and keep it running. Reload the rebuilt extension.
4. In **Audio settings**, keep **Kokoro local voices** selected. **Connect Kokoro** checks readiness and grants optional localhost access. Turning sound on also requests that permission if needed.
5. Enable sound. George is reserved for the therapist; the 12 other voices are automatically distributed across the tabs without reuse. Casting is stable when the cast order changes and persists on reload. Every voice can still be overridden.
6. Use **Preview delivery** to audition a voice as neutral, happy, smug, angry, shocked, crying, suspicious, or victorious. The therapist retains a measured, confident delivery. Previews pause the session.

After setup, the worker forces Hugging Face and Transformers offline mode. All voices are preloaded from the local cache. The speech route never calls ElevenLabs and does not silently switch engines on failure. Models live in `.local-voices/`, the isolated Python environment in `.venv-kokoro/`; neither is committed or bundled into the extension.

## Reaction delivery and limits

Kokoro does not expose an emotion-tag API. This implementation directs pacing, sentence pauses, and restrained gain: faster and tighter for frustration, slower and spaced for disappointment, measured pauses for skepticism, and steady delivery for the therapist. It preserves natural pitch and timbre rather than pitch-shifting voices. This provides distinct delivery profiles, not a guarantee of actor-level emotional performance. Voice descriptions describe the intended casting and should be auditioned on your speakers.

Defend, challenge, retirement, victory, and duplicate reactions choose the corresponding delivery profile. The scene clock waits for actual playback to end. Mouth animation begins when audio plays and now also covers reaction lines. Pause, mute, scene changes, and previews cancel old playback. Canceled inference may finish on the local CPU, but its audio is discarded; outstanding inference slots remain bounded so repeated interruptions cannot queue unlimited work.

The server binds to `127.0.0.1:4317`, accepts only configured local/extension origins, validates voice IDs against the installed cast, and caches speech by engine, voice, text, and emotion in bounded memory. Audio and dialogue are not written to disk during ordinary use. The local worker does not log spoken text. Restarting the server clears audio memory.

`npm run voice:verify` is an optional real-model check. It creates six fictional WAV samples under `artifacts/kokoro/`, including therapist, angry, disappointed, skeptical, and matched neutral/sad deliveries. It runs the server with cloud fetching disabled. These deliberate test artifacts contain no real browsing data.

Setup and runtime are supported by the included scripts on macOS/Linux with uv. Windows paths are not yet supported. CPU speech generation may pause the scene while a line is prepared, particularly on the first request. The **Device voices (preview quality)** engine remains available without running a server.

References: [Kokoro implementation](https://github.com/hexgrad/kokoro), [voice roster and evaluations](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md). Kokoro code and model weights use Apache 2.0; dependency licenses are separate.

## Optional ElevenLabs engine

The optional cloud speech engine uses ElevenLabs through a local Node server. The therapist has a dedicated voice. Each tab gets a separate voice when the account has enough voices; otherwise the studio explicitly reports shared voices. A 12-tab session needs 13 available voices for fully distinct casting.

1. Open `.env` in the project root. Set `ELEVENLABS_API_KEY` to your key. The file is ignored by Git. Do not add a `VITE_` prefix.
2. For the extension, copy its ID from `brave://extensions` or the app's Audio settings and set `TA_EXTENSION_ID` in `.env`.
3. Run `npm run voice:server` from the project directory. Keep that terminal running. Restart it after changing `.env`.
4. Reload the extension. Open **Audio settings**, keep **ElevenLabs expressive voices** selected, and click **Connect ElevenLabs**. Grant access to the local server when prompted.
5. Preview and choose a deep, confident narrator for the therapist. Automatic casting reserves that voice and distributes the other voices across tabs. Each row has an override and Preview button. Preview pauses the session.
6. Enable **Sound**, then start or resume the session. **Replay line** retries the current dialogue. Pause, mute, skip, and scene changes cancel pending or playing audio. Voice assignments survive reload; sound always starts muted.

The default model is `eleven_v3`. Delivery tags are added by the server for confidence, excitement, sarcasm, frustration, surprise, sadness, and curiosity. These are generation directions, not a guarantee of an exact performance. Audition the selected voices with your account before a demo. This implementation was verified with mocked provider responses; a real key is required to evaluate voice quality and account access.

The local server listens only on `127.0.0.1:4317`. Allowed browser origins are the local demo ports 5173/4173 and the exact configured extension ID. It requires a custom request header, bounds speech length, limits concurrent requests, and never returns the API key. Speech responses are cached in memory up to 32 MB and discarded when the server stops. It does not log dialogue or write recordings to disk.

ElevenLabs receives the spoken text, which can include tab titles. Account quota, charges, and provider retention apply. No remote call happens simply by opening the app. Connecting fetches the account's voice list; sound playback and previews generate speech. Canceled requests may already have been processed by the provider.

**Device voices (preview quality)** is an explicit alternate engine. It uses local English voices with separate assignments and restrained pitch/rate changes. The app does not silently switch to it when cloud setup fails.

Troubleshooting:

- Connection failure: start the server, check `.env`, and verify the extension ID.
- Provider rejection: check the API key's voice-list and text-to-speech permissions, model access, voice access, and quota.
- Few distinct voices: add more available account voices, then reconnect and auto-assign.
- Silent playback: unmute the browser tab, check system volume, and use Test sound. Cloud errors appear in the studio.

API references: [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [voice list](https://elevenlabs.io/docs/api-reference/voices/search), and [emotional delivery tags](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/how-do-audio-tags-work-with-eleven-v3-and-v4).
