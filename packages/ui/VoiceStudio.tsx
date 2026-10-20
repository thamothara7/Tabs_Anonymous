import { useState } from 'react';
import type { Character, Emotion } from '../game-core/types';
import { autoCast, connectCloudVoices, type VoiceMode, type CastVoice } from './voices';
export function VoiceStudio({
  cast,
  localVoices,
  mode,
  setMode,
  mapping,
  setMapping,
  cloudVoices,
  setCloudVoices,
  status,
  onPreview,
}: {
  cast: Character[];
  localVoices: SpeechSynthesisVoice[];
  mode: VoiceMode;
  setMode: (mode: VoiceMode) => void;
  mapping: Record<string, string>;
  setMapping: (value: Record<string, string>) => void;
  cloudVoices: CastVoice[];
  setCloudVoices: (value: CastVoice[]) => void;
  status: string;
  onPreview: (id: string, emotion: Emotion) => void;
}) {
  const [message, setMessage] = useState('');
  const [previewEmotion, setPreviewEmotion] = useState<Emotion>('neutral');
  const [busy, setBusy] = useState(false);
  const available =
    mode === 'cloud' || mode === 'kokoro'
      ? cloudVoices
      : localVoices.map((v) => ({ id: v.voiceURI, name: v.name }));
  const rows = [
    {
      id: 'therapist',
      name: 'The therapist',
      role: 'Main voice. Choose a deep, authoritative narrator.',
    },
    ...cast.map((c) => ({ id: c.id, name: c.name, role: c.role })),
  ];
  const connect = async () => {
    setBusy(true);
    try {
      const voices = await connectCloudVoices(mode === 'kokoro' ? 'kokoro' : 'cloud');
      setCloudVoices(voices);
      setMapping(autoCast(voices, cast));
      setMessage(
        'Connected. Previews pause the session. Start with the therapist, then adjust the cast voices below.',
      );
    } catch (e) {
      setMessage(
        e instanceof Error && e.message !== 'Failed to fetch'
          ? e.message
          : 'Start npm run voice:server, then reconnect. Kokoro setup: npm run voice:setup.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="voice-studio" aria-label="Voice studio">
      <div className="voice-studio-heading">
        <b>Voice casting</b>
        <label>
          Speech engine{' '}
          <select
            aria-label="Speech engine"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="kokoro">Kokoro local voices</option>
            <option value="cloud">ElevenLabs expressive voices</option>
            <option value="local">Device voices (preview quality)</option>
            <option value="off">Effects only</option>
          </select>
        </label>
      </div>
      {(mode === 'cloud' || mode === 'kokoro') && (
        <div className="cloud-setup">
          <p>
            {mode === 'kokoro'
              ? 'Speech is generated on this computer. George leads the session; tabs get distinct voices automatically. Reaction delivery uses pacing and pauses.'
              : 'ElevenLabs receives spoken lines, including tab titles. Your API key stays in the local voice server.'}
          </p>
          <button className="button" disabled={busy} onClick={() => void connect()}>
            {busy
              ? 'Loading voices...'
              : mode === 'kokoro'
                ? 'Connect Kokoro'
                : 'Connect ElevenLabs'}
          </button>
          <small>
            {mode === 'kokoro' ? (
              <>
                First run <code>npm run voice:setup</code>, then <code>npm run voice:server</code>.
                No API key.
              </>
            ) : (
              <>
                Start <code>npm run voice:server</code> after configuring <code>.env</code>.
              </>
            )}{' '}
            {location.protocol === 'chrome-extension:' && (
              <>
                Extension ID: <code>{location.hostname}</code>
              </>
            )}
          </small>
        </div>
      )}
      {mode === 'local' && (
        <p>
          Device speech cannot match expressive cloud voices.{' '}
          {available.length
            ? `${available.length} installed English voices available.`
            : 'No installed English voices found.'}
        </p>
      )}
      {mode !== 'off' && available.length > 0 && (
        <>
          <button
            className="button"
            onClick={() => setMapping(autoCast(available, cast, mapping.therapist))}
          >
            Assign different voices automatically
          </button>
          <p>
            {new Set(Object.values(mapping)).size} distinct voices assigned.{' '}
            {available.length < cast.length + 1 &&
              'Some voices are shared because fewer voices are available than characters.'}
          </p>
          <label className="preview-delivery">
            Preview delivery{' '}
            <select
              aria-label="Preview delivery"
              value={previewEmotion}
              onChange={(e) => setPreviewEmotion(e.target.value as Emotion)}
            >
              {(
                [
                  'neutral',
                  'happy',
                  'smug',
                  'angry',
                  'shocked',
                  'crying',
                  'suspicious',
                  'victorious',
                ] as Emotion[]
              ).map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <small>The therapist always uses a measured, confident delivery.</small>
          </label>
          <div className="voice-cast-list">
            {rows.map((row) => (
              <div
                className={`voice-cast-row ${row.id === 'therapist' ? 'therapist-casting' : ''}`}
                key={row.id}
              >
                <label>
                  <b title={row.name}>{row.name}</b>
                  <small>{row.role}</small>
                  <select
                    aria-label={
                      row.id === 'therapist' && mode === 'local'
                        ? 'Local voice'
                        : `Voice for ${row.id === 'therapist' ? 'therapist' : row.name}`
                    }
                    value={mapping[row.id] ?? ''}
                    onChange={(e) => setMapping({ ...mapping, [row.id]: e.target.value })}
                  >
                    <option value="">Choose voice</option>
                    {available.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button"
                  disabled={!mapping[row.id]}
                  onClick={() => onPreview(row.id, previewEmotion)}
                >
                  Preview
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {message && <p>{message}</p>}
      <p role="status">{status}</p>
    </section>
  );
}
