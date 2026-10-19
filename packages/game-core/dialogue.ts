import type { Category } from './types';
const confessions: Record<Category, string[]> = {
  code: [
    'I arrived for career development. Apparently I’m the decorative tab.',
    'My contribution to this meeting is a strongly worded issue with no assignee.',
  ],
  video: [
    'Your Honor, educational procrastination is still educational.',
    'I brought a twelve-part explanation for why this meeting needs an intermission.',
  ],
  study: [
    'I brought an agenda. Apparently we’re doing interpretive chaos instead.',
    'Can I put this meeting in a document? It would feel more under control.',
  ],
  shopping: [
    'I’m not an impulse purchase. I’m a limited-time opportunity for self-expression.',
    'My defense is in the cart. We can discuss shipping after the verdict.',
  ],
  social: [
    'I have a hot take and absolutely no plan to keep it to myself.',
    'This support group would do incredible numbers as a thread.',
  ],
  events: [
    'I’m not overcommitted. I’m collecting potential future versions of myself.',
    'My deadline and my confidence have never met. I’d like to keep it that way.',
  ],
  design: [
    'I made three mood boards for this crisis. None of them include closure.',
    'I support boundaries. Could we make them a little more rounded?',
  ],
  other: [
    'I am not abandoned. I’m strategically archived in plain sight.',
    'My purpose is mysterious. My need for a seat is very clear.',
  ],
};
export function confessionFor(category: Category, variant = 0): string {
  const lines = confessions[category];
  return lines[Math.abs(variant) % lines.length];
}
