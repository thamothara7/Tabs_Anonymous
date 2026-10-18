import { duplicateGroups } from './classify';
import type { Beat, Character } from './types';
export function storyFor(cast: Character[], seed = 42): Beat[] {
  const by = (category: Character['category']) =>
    cast.find((c) => c.category === category)?.id ?? cast[0]?.id ?? 'therapist';
  const duplicate = duplicateGroups(cast)[0];
  return [
    {
      speaker: 'therapist',
      line: 'Welcome to Tabs Anonymous. A safe space for things you said you’d come back to.',
      cue: 'entrance',
      duration: 6500,
      label: 'Everybody, take a seat.',
    },
    {
      speaker: by('code'),
      line:
        seed % 2
          ? 'I was opened for personal growth. So far, I’ve only witnessed personal scrolling.'
          : 'I haven’t been solved. I’ve been emotionally bookmarked.',
      cue: 'talk',
      duration: 7200,
      label: 'The first confession',
    },
    {
      speaker: by('video'),
      line: 'Your Honor, educational procrastination is still educational.',
      cue: 'talk',
      duration: 6500,
      target: by('code'),
      label: 'A very reasonable defense',
    },
    {
      speaker: duplicate?.[0] ?? by('study'),
      line: duplicate
        ? 'Wait. Same address. Same face. One of us is redundant. Statistically, it’s him.'
        : 'I brought an agenda. Apparently we’re doing interpretive chaos instead.',
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
      line: 'Let’s form healthy attachments. Preferably not twelve of them in the same window.',
      cue: 'betrayal',
      duration: 6500,
      target: by('study'),
      label: 'Round 02 · Questionable alliances',
    },
    {
      speaker: by('code'),
      line: 'I propose a productivity alliance. The video tab can take the minutes. Quietly.',
      cue: 'betrayal',
      duration: 6500,
      target: by('video'),
      label: 'A hostile reorganization',
    },
    {
      speaker: by('video'),
      line: 'Sure. Here are the minutes: one minute ago, this meeting had no popcorn. You’re welcome.',
      cue: 'popcorn',
      duration: 7000,
      target: by('code'),
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
