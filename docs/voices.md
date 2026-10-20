# Automatic local voices

Kokoro is the only speech engine. It runs on your computer through a local Node server and a persistent Python worker. No API key, cloud provider, browser speech fallback, or per-character settings.

1. Run `npm run voice:setup` once. The script uses [uv](https://docs.astral.sh/uv/getting-started/installation/) to install Python 3.12, pinned dependencies, the model, and 13 English voices. Setup needs internet and roughly 1.5 GB of disk space. It does not send tab data.
2. For the extension, set `TA_EXTENSION_ID` in the Git-ignored `.env` to the ID from `brave://extensions`. The web demo requires no environment configuration.
3. Run `npm run voice:server` and keep it running. Reload the rebuilt extension.
4. Click **Sound off**. This requests optional localhost permission, checks the complete voice roster, and warms the worker. A cold start can take a minute; **Cancel voice startup** remains available.
5. Start or resume therapy. George is reserved for the therapist. Twelve other voices are distributed without reuse, with category preferences and stable casting when the same cast is reordered. Old manual overrides are ignored. Delivery follows the reaction automatically.

The panel has been removed. There is one Sound toggle and a short status line. Volume is fixed at 65% in the app; use your system volume. **Replay line** repeats the current sentence. If speech fails, sound switches off, captions continue, and **Retry sound** reconnects. No silent fallback to a different engine occurs. Sound starts off on reload.

## Delivery and limitations

Kokoro has no emotion-tag API. The worker directs pacing, sentence pauses, and restrained gain: faster and tighter for frustration, slower and spaced for disappointment, measured pauses for skepticism, and steady delivery for the therapist. Natural pitch and timbre are preserved. These delivery profiles do not guarantee actor-level emotional performance.

Defend, challenge, retirement, victory, duplicates, and witness testimony select appropriate delivery. The scene waits for actual playback to end. Mouth animation begins when audio plays. Pause, mute, scene changes, and unmount cancel playback. Canceled inference may finish on the CPU, but its audio is discarded and the occupied inference slot stays bounded until completion.

## Local data flow

After setup, Hugging Face and Transformers run in offline mode. Models live in `.local-voices/` and Python in `.venv-kokoro/`; neither is committed or bundled into the extension. Setup/runtime scripts support macOS and Linux with uv. Windows paths are not supported yet.

The server binds to `127.0.0.1:4317`, checks exact configured origins, validates voice IDs, and caches speech by voice, text, emotion, and therapist status in bounded memory. It exposes `/kokoro/voices`, `/kokoro/speech`, and `/health`. Cloud routes have been removed. Spoken lines can include tab titles, but stay on this computer. Ordinary playback writes no audio files or dialogue logs. Stopping the server stops its worker and clears the cache.

`npm run voice:verify` is an optional real-model check. It writes six fictional WAV samples under `artifacts/kokoro/`, including matched neutral/sad deliveries. These test artifacts contain no real browsing data.

References: [Kokoro implementation](https://github.com/hexgrad/kokoro), [voice roster](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md). Code/model weights use Apache 2.0; dependency licenses are separate.
