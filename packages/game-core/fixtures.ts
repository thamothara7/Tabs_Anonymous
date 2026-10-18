import type { Category, Character, TabFact } from './types';
const looks: Record<Category, { color: string; symbol: string; role: string }> = {
  code: { color: '#c3b4f2', symbol: '</>', role: 'The overachiever' },
  video: { color: '#f49a86', symbol: '▶', role: 'The distraction' },
  study: { color: '#a6cfb4', symbol: '≡', role: 'The responsible one' },
  shopping: { color: '#f0ca7b', symbol: '袋', role: 'The impulse buy' },
  social: { color: '#eab2ce', symbol: '#', role: 'The oversharer' },
  other: { color: '#9bcbd7', symbol: '✦', role: 'The mysterious one' },
};
export function makeCharacter(tab: TabFact, index: number): Character {
  return {
    ...tab,
    ...looks[tab.category],
    name: tab.title.slice(0, 32),
    emotion: 'neutral',
    loyalty: 45 + (index % 4) * 8,
    confidence: 45 + (index % 5) * 9,
    fate: 'undecided',
    allies: [],
    grudges: [],
  };
}
const rows: [string, string, Category, string][] = [
  ['LeetCode', 'https://leetcode.com/problems/two-sum/', 'code', 'The gifted burnout'],
  ['YouTube', 'https://www.youtube.com/watch?v=demo-cat', 'video', 'The “one more” guy'],
  ['Google Docs', 'https://docs.google.com/document/d/demo', 'study', 'The group-project parent'],
  ['GitHub', 'https://github.com/example/side-project', 'code', 'The quiet judge'],
  ['Shopping cart', 'https://www.amazon.com/cart', 'shopping', 'The impulse buy'],
  ['LeetCode (2)', 'https://leetcode.com/problems/two-sum/', 'code', 'The identical stranger'],
  ['Reddit', 'https://www.reddit.com/r/programming', 'social', 'The rabbit hole'],
  ['Study playlist', 'https://www.youtube.com/watch?v=demo-lofi', 'video', 'The soundtrack'],
  ['Wikipedia', 'https://en.wikipedia.org/wiki/Octopus', 'study', 'The fun-fact friend'],
  ['Figma', 'https://www.figma.com/design/demo', 'study', 'The perfectionist'],
  ['Weather', 'https://weather.example/forecast', 'other', 'The small talk'],
  ['Very important article', 'https://reading.example/important', 'other', 'The someday read'],
];
export const demoCharacters: Character[] = rows.map(([title, url, category, role], i) => ({
  ...makeCharacter(
    { id: `tab-${i}`, title, url, category, pinned: i === 3, audible: i === 7, protected: i === 3 },
    i,
  ),
  role,
  ...(i === 3 ? { color: '#b8bfcc', symbol: '{ }' } : {}),
}));
