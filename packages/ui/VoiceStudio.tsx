import { useState } from 'react';
import type { Character } from '../game-core/types';
import { autoCast, connectCloudVoices, type CastVoice } from './voices';
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
  mode: 'cloud' | 'local' | 'off';
  setMode: (mode: 'cloud' | 'local' | 'off') => void;
  mapping: Record<string, string>;
  setMapping: (value: Record<string, string>) => void;
  cloudVoices: CastVoice[];
  setCloudVoices: (value: CastVoice[]) => void;
  status: string;
  onPreview: (id: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const available =
    mode === 'cloud' ? cloudVoices : localVoices.map((v) => ({ id: v.voiceURI, name: v.name }));
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
      const voices = await connectCloudVoices();
      setCloudVoices(voices);
      setMode('cloud');
      setMapping(autoCast(voices, cast));
      setMessage(
        'Connected. Previews pause the session. Start with the therapist, then adjust the cast voices below.',
      );
    } catch (e) {
      setMessage(
        e instanceof Error && e.message !== 'Failed to fetch'
          ? e.message
          : 'Start npm run voice:server and configure .env. Then reconnect.',
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
            <option value="cloud">ElevenLabs expressive voices</option>
            <option value="local">Device voices (preview quality)</option>
            <option value="off">Effects only</option>
          </select>
        </label>
      </div>
      {mode === 'cloud' && (
        <div className="cloud-setup">
          <p>
            ElevenLabs receives spoken lines, including tab titles. Your API key stays in the local
            voice server.
          </p>
          <button className="button" disabled={busy} onClick={() => void connect()}>
            {busy ? 'Connecting...' : 'Connect ElevenLabs'}
          </button>
          <small>
            Start <code>npm run voice:server</code> after configuring <code>.env</code>.{' '}
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
              'Some voices must be shared. Add more account voices for a unique voice per tab.'}
          </p>
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
                  onClick={() => onPreview(row.id)}
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
