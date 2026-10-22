import { useEffect, useRef, useState } from 'react';
import type { Cue, Emotion, GameState } from '../game-core/types';
import { duplicateGroups } from '../game-core/classify';
import { domainOf } from '../game-core/context';
import { storyFor } from '../game-core/events';
import { reducer } from '../game-core/reducer';
import { DialogueClient } from './dialogueClient';
import { ensureVoicePermission, localConnectionError } from './voices';
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
export const dialogueKey = (s: GameState, speaker: string) =>
  `${s.seed}:${s.phase}:${s.beat}:${s.actionSerial}:${s.actionLine ? 'reaction' : 'scene'}:${speaker}`;
export function useDialogue(
  state: GameState,
  speaker: string,
  target: string | null,
  scene: string,
  fallback: string,
  paused: boolean,
  onGenerated: (line: string, emotion: Emotion) => void,
  onPrepared?: (line: string, emotion: Emotion, speaker: string, cue: Cue) => void,
) {
  const [enabled, setEnabled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState(
    'Local AI can improvise from this cast and the conversation.',
  );
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<{ key: string; value: DialogueResult } | null>(null);
  const client = useRef(new DialogueClient());
  const prepare = useRef(onPrepared);
  prepare.current = onPrepared;
  const activation = useRef(0);
  const callback = useRef(onGenerated);
  callback.current = onGenerated;
  const key = dialogueKey(state, speaker);
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
    client.current.cancelPending();
    setEnabled(false);
    setConnecting(false);
    setFailed(false);
    setStatus('Scripted dialogue. Switch on AI to let the cast improvise.');
  };
  useEffect(
    () => () => {
      activation.current++;
      client.current.cancelPending();
    },
    [],
  );
  useEffect(() => {
    if (!enabled || !active || paused) {
      client.current.cancelPending();
      return;
    }
    let obsolete = false;
    client.current.retain(key);
    setStatus(`${speaker === 'therapist' ? 'The therapist' : 'The cast'} is improvising…`);
    const complete = callback.current;
    const input = dialogueContext(state, speaker, target, scene);
    void client.current
      .request(key, input)
      .then((data) => {
        if (obsolete) return;
        setResult({ key, value: data });
        setStatus('AI dialogue · Written on this computer');
        if (result?.key !== key) complete(data.line, data.emotion);
        if (state.phase !== 'playing' || state.actionLine) return;
        const recorded = reducer(state, {
          type: 'RECORD_DIALOGUE',
          phase: state.phase,
          seed: state.seed,
          beat: state.beat,
          serial: state.actionSerial,
          speaker,
          line: data.line,
          emotion: data.emotion,
        });
        const next = reducer(recorded, { type: 'NEXT' });
        const beat = storyFor(next.characters, next.seed)[next.beat];
        if (next.phase !== 'playing' || !beat) return;
        const nextKey = dialogueKey(next, beat.speaker);
        void client.current
          .request(
            nextKey,
            dialogueContext(
              next,
              beat.speaker,
              beat.target ?? null,
              dialogueScene(next, beat.label),
            ),
          )
          .then((reply) => {
            if (!obsolete) prepare.current?.(reply.line, reply.emotion, beat.speaker, beat.cue);
          })
          .catch(() => {
            /* Foreground retry owns errors; speculative work must not interrupt speech. */
          });
      })
      .catch((error) => {
        if (obsolete) return;
        setEnabled(false);
        setFailed(true);
        setStatus(`Scripted dialogue is continuing. ${localConnectionError(error)}`);
      });
    return () => {
      obsolete = true;
    };
    // Capture each turn once. Dossier selection and history updates do not invalidate it.
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
