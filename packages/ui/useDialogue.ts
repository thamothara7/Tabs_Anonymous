import { useEffect, useRef, useState } from 'react';
import type { Emotion, GameState } from '../game-core/types';
import { duplicateGroups } from '../game-core/classify';
import { domainOf } from '../game-core/context';
import { storyFor } from '../game-core/events';
import {
  ensureVoicePermission,
  localConnectionError,
  VOICE_SERVER,
  serviceHeaders,
} from './voices';
import type { DialogueInput, DialogueResult } from '../../apps/voice-server/dialogue';

export function dialogueContext(
  state: GameState,
  speaker: string,
  target: string | null,
  scene: string,
): DialogueInput {
  const duplicates = duplicateGroups(state.characters);
  const pendingScript =
    state.actionLine ?? storyFor(state.characters, state.seed)[state.beat]?.line;
  return {
    speaker,
    target,
    scene: scene.slice(0, 180),
    cast: state.characters.map((c) => ({
      id: c.id,
      title: c.title.slice(0, 160),
      domain: domainOf(c),
      role: c.role.slice(0, 80),
      category: c.category,
      fate: c.fate,
      audible: c.audible,
      duplicateOf: (duplicates.find((g) => g.includes(c.id)) ?? []).filter((id) => id !== c.id),
    })),
    recent: state.history
      .filter((line) => line !== pendingScript)
      .slice(-6)
      .map((s) => s.slice(0, 500)),
  };
}
export function dialogueScene(state: GameState, storyLabel: string): string {
  if (!state.actionLine)
    return state.phase === 'voting'
      ? 'Host the final vote. Invite a verdict; six tabs can be kept and real tabs stay open.'
      : storyLabel;
  switch (state.actionCue) {
    case 'popcorn':
      return 'The therapist gently roasts the recipient based on the conversation and their topic.';
    case 'angry':
      return 'The player challenged your usefulness. Answer with comic indignation about your topic.';
    case 'victory':
      return 'The player supported you. React gratefully with a boast about your topic.';
    case 'retire':
      return 'You were retired to the fictional balcony. Give a dramatic farewell; your real tab stays open.';
    case 'group':
      return 'You were assigned to a fictional group. Joke about your new colleagues.';
    default:
      return state.actionTarget !== state.selected
        ? 'Give comic witness testimony about the recipient. Reply to what was just said.'
        : 'You have the microphone. Answer the previous speaker and defend your place in this browser.';
  }
}
export function useDialogue(
  state: GameState,
  speaker: string,
  target: string | null,
  scene: string,
  fallback: string,
  paused: boolean,
  onGenerated: (line: string, emotion: Emotion) => void,
) {
  const [enabled, setEnabled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState(
    'Local AI can improvise from this cast and the conversation.',
  );
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<{ key: string; value: DialogueResult } | null>(null);
  const cache = useRef(new Map<string, DialogueResult>());
  const activation = useRef(0);
  const callback = useRef(onGenerated);
  callback.current = onGenerated;
  const key = `${state.seed}:${state.phase}:${state.beat}:${state.actionSerial}:${state.actionLine ? 'reaction' : 'scene'}:${speaker}`;
  const active = state.phase === 'playing' || state.phase === 'voting';
  const ready = result?.key === key ? result.value : null;
  const enable = async () => {
    const version = ++activation.current;
    setConnecting(true);
    setFailed(false);
    setStatus('Connecting to the local AI writer…');
    try {
      await ensureVoicePermission();
      if (version === activation.current) {
        setEnabled(true);
        setStatus('Local AI is ready to improvise.');
      }
    } catch (error) {
      if (version === activation.current) {
        setFailed(true);
        setStatus(localConnectionError(error));
      }
    } finally {
      if (version === activation.current) setConnecting(false);
    }
  };
  const disable = () => {
    activation.current++;
    setEnabled(false);
    setConnecting(false);
    setFailed(false);
    setStatus('Scripted dialogue. Switch on AI to let the cast improvise.');
  };
  useEffect(
    () => () => {
      activation.current++;
    },
    [],
  );
  useEffect(() => {
    if (!enabled || !active || paused) return;
    const cached = cache.current.get(key);
    if (cached) {
      setResult({ key, value: cached });
      return;
    }
    const controller = new AbortController();
    setStatus(`${speaker === 'therapist' ? 'The therapist' : 'The cast'} is improvising…`);
    const complete = callback.current;
    const input = dialogueContext(state, speaker, target, scene);
    void (async () => {
      try {
        const response = await fetch(`${VOICE_SERVER}/dialogue`, {
          method: 'POST',
          headers: { ...serviceHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(50000)]),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Local AI could not write this line.');
        if (
          typeof data.line !== 'string' ||
          data.line.length < 8 ||
          data.line.length > 320 ||
          ![
            'neutral',
            'happy',
            'smug',
            'angry',
            'shocked',
            'crying',
            'suspicious',
            'victorious',
          ].includes(data.emotion) ||
          data.source !== 'local-ai'
        )
          throw new Error('Local AI returned an invalid response.');
        if (controller.signal.aborted) return;
        if (cache.current.size >= 40) cache.current.delete(cache.current.keys().next().value!);
        cache.current.set(key, data);
        setResult({ key, value: data });
        setStatus('AI dialogue · Written on this computer');
        complete(data.line, data.emotion);
      } catch (error) {
        if (controller.signal.aborted) return;
        setEnabled(false);
        setFailed(true);
        setStatus(`Scripted dialogue is continuing. ${localConnectionError(error)}`);
      }
    })();
    return () => controller.abort();
    // Context is captured once per turn. Selecting a dossier or recording this line must not regenerate it.
  }, [enabled, active, paused, key]);
  return {
    line: enabled && ready ? ready.line : fallback,
    emotion: enabled && ready ? ready.emotion : undefined,
    pending: active && (connecting || (enabled && !ready && !paused)),
    enabled,
    connecting,
    failed,
    status,
    enable,
    disable,
  };
}
