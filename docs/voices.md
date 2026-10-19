# Expressive voice setup

The main speech engine uses ElevenLabs through a local Node server. The therapist has a dedicated voice. Each tab gets a separate voice when the account has enough voices; otherwise the studio explicitly reports shared voices. A 12-tab session needs 13 available voices for fully distinct casting.

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
