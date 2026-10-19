import { personalLine, shortTitle } from './dialogue';
import { duplicateGroups } from './classify';
import type { Beat, Character } from './types';
export function storyFor(cast: Character[], seed = 42): Beat[] {
  const by = (category: Character['category']) =>
    cast.find((c) => c.category === category)?.id ?? cast[0]?.id ?? 'therapist';
  const worker =
    cast.find((c) => ['code', 'study', 'events', 'design'].includes(c.category)) ?? cast[0];
  const entertainer =
    cast.find((c) => ['video', 'social', 'shopping'].includes(c.category)) ??
    cast.find((c) => c.id !== worker?.id) ??
    cast[0];
  const duplicate = duplicateGroups(cast)[0];
  return [
    {
      speaker: 'therapist',
      line: `Welcome to Tabs Anonymous. ${cast.length} tabs, ${new Set(cast.map((c) => c.category)).size} personalities, one person insisting this is a system.`,
      cue: 'entrance',
      duration: 6500,
      label: 'Everybody, take a seat.',
    },
    {
      speaker: worker?.id ?? 'therapist',
      line: worker ? personalLine(worker, seed) : 'An empty room. Finally, some peace.',
      cue: 'talk',
      duration: 7200,
      label: 'The first confession',
    },
    {
      speaker: entertainer?.id ?? 'therapist',
      line: entertainer ? personalLine(entertainer, seed + 1) : 'Even the chairs have left.',
      cue: 'talk',
      duration: 6500,
      target: worker?.id,
      label: 'A very reasonable defense',
    },
    {
      speaker: duplicate?.[0] ?? by('study'),
      line: duplicate
        ? `Wait. Another “${shortTitle(cast.find((c) => c.id === duplicate[1])!)}”? Same address. One of us is redundant. Statistically, it’s him.`
        : `No duplicates today. Just ${cast.length} completely original excuses for staying open.`,
      cue: duplicate ? 'duplicate' : 'talk',
      duration: 7800,
      target: duplicate?.[1],
      label: duplicate ? 'An identity crisis' : 'A gentle intervention',
    },
    {
      speaker: duplicate?.[1] ?? by('other'),
      line: duplicate
        ? 'I’m not a duplicate. I’m a backup plan with feelings.'
        : 'I would like to remain mysterious, and also open.',
      cue: 'talk',
      duration: 6000,
      target: duplicate?.[0],
      label: 'The plot thickens',
    },
    {
      speaker: 'therapist',
      line: `Let’s form healthy attachments. Preferably not ${cast.length} of them in the same window.`,
      cue: 'betrayal',
      duration: 6500,
      target: by('study'),
      label: 'Round 02 · Questionable alliances',
    },
    {
      speaker: worker?.id ?? 'therapist',
      line:
        entertainer?.category === 'video'
          ? 'I propose a productivity alliance. The video tab can take the minutes. Quietly.'
          : `I propose an alliance with “${entertainer ? shortTitle(entertainer) : 'the empty chair'}”. Our combined potential is now officially a scheduling problem.`,
      cue: 'betrayal',
      duration: 6500,
      target: entertainer?.id,
      label: 'A hostile reorganization',
    },
    {
      speaker: entertainer?.id ?? 'therapist',
      line: 'Sure. Here are the minutes: one minute ago, this meeting had no popcorn. You’re welcome.',
      cue: 'popcorn',
      duration: 7000,
      target: worker?.id,
      label: 'Productivity has left the chat',
    },
    {
      speaker: 'therapist',
      line: 'A gentle reminder: you can defend a tab without enabling its entire personality.',
      cue: 'talk',
      duration: 5500,
      label: 'Your intervention is welcome',
    },
    {
      speaker: 'therapist',
      line: 'Time to decide. Keep six stars, group the supporting cast, or retire them from the arena. Your actual tabs are safe.',
      cue: 'vote',
      duration: 5500,
      label: 'Round 03 · Last tab standing',
    },
  ];
}
