import { domainOf, topicsOf, relatedTabs, sharedTopics } from './context';
import { duplicateGroups } from './classify';
import type { Category, Character, Fate, GameState } from './types';

export function shortTitle(c: Pick<Character, 'title'>, limit = 42): string {
  const text = c.title.replace(/\s+/g, ' ').trim() || 'Untitled tab';
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}
const jokes: Record<Category, string[]> = {
  code: [
    'I have 99 problems. Opening another problem is apparently the solution.',
    'My code review says “looks good.” My emotional review says “needs work.”',
    'I’m a side project. At this point, the side is the entire personality.',
  ],
  video: [
    'The next video is educational. So were the previous seventeen alibis.',
    'My progress bar is doing more progressing than this project.',
    'I came with subtitles because your attention has left the room.',
  ],
  study: [
    'I’m a study plan with no eyewitnesses.',
    'Reading my title counts as revision, right?',
    'You opened me to learn something. So far we’ve learned how to open tabs.',
  ],
  shopping: [
    'The cart is full. The justification is still loading.',
    'Free shipping is not a financial strategy, but I admire the commitment.',
    'I’m not impulse buying. I’m researching who you could be with a lamp.',
  ],
  social: [
    'I came for one notification. I brought a constitutional crisis.',
    'This meeting could have been a post nobody finished reading.',
    'Your attention span and I are in a very exclusive relationship.',
  ],
  events: [
    'I’m collecting potential future versions of myself. None has submitted yet.',
    'Another hackathon? Excellent. The unfinished projects needed a reunion.',
    'My pitch deck has a roadmap. Your calendar has a restraining order.',
  ],
  design: [
    'I made three mood boards for this crisis. None includes closure.',
    'The project is unfinished, but the inspiration folder is award-winning.',
    'One more reference and we can finally begin choosing a reference.',
  ],
  other: [
    'You forgot why I’m here. I’m choosing to call that job security.',
    'I am not abandoned. I’m strategically archived in plain sight.',
    'My purpose is mysterious. My rent in your tab bar is overdue.',
  ],
};
export function confessionFor(category: Category, variant = 0): string {
  return jokes[category][Math.abs(variant) % jokes[category].length];
}
export function contextLines(c: Character, cast: Character[]): string[] {
  const topics = topicsOf(c);
  const topic = topics.slice(0, 3).join(' ') || shortTitle(c, 28);
  const site = shortTitle({ title: domainOf(c) || 'an unnamed site' }, 60);
  const peer = relatedTabs(c, cast)[0];
  const shared = peer ? sharedTopics(c, peer) : [];
  const sameSite = cast.filter((t) => domainOf(t) === domainOf(c)).length;
  const duplicate = duplicateGroups(cast).find((pair) => pair.includes(c.id));
  return [
    ...(duplicate
      ? [
          `There are ${duplicate.length} copies of my address in this room. I cover ${topic}; my understudy covers plausible deniability.`,
        ]
      : []),
    ...(shared.length && peer
      ? [
          `“${shortTitle(peer, 30)}” and I both mention ${shared[0]}. We would like separate budgets for the same obsession.`,
          `Another ${shared[0]} tab! Between me and “${shortTitle(peer, 30)}”, we could form a support group inside the support group.`,
        ]
      : []),
    ...(c.audible
      ? [
          `Yes, the sound is coming from ${site}. I assumed a discussion about ${topic} deserved musical accompaniment.`,
        ]
      : []),
    ...(sameSite > 1
      ? [
          `${site} has ${sameSite} representatives here. My department is ${topic}. We are calling this expansion, not a problem.`,
        ]
      : []),
    `My title promises ${topic}. Please judge me on that specific ambition. General disappointment is another department.`,
    `I came from ${site} to discuss ${topic}. Somehow my job interview became an intervention.`,
    `Put ${topic} on the agenda. If we run out of time, I can remain open until the next meeting. Very convenient.`,
    `Before you vote, say ${topic} out loud. Sounds important, doesn't it? That was my entire application.`,
    ...(peer
      ? [
          `If “${shortTitle(peer, 30)}” gets a seat, I want a second opinion. Preferably from someone at ${site}.`,
        ]
      : []),
  ];
}
export function personalLine(c: Character, variant = 0, cast: Character[] = [c]): string {
  const pool = contextLines(c, cast);
  return `“${shortTitle(c)}” here. ${pool[Math.abs(variant) % pool.length]}`;
}
const commonLines = [
  'I was opened with confidence and maintained with guilt.',
  'I brought supporting evidence. It is in another tab, naturally.',
  'My five-year plan is to survive this afternoon.',
  'I am one click away from being useful. We have been one click away for some time.',
  'Nobody asked how the tab feels. Excellent, I prepared a presentation.',
  'I would like to appeal to a less productive browser.',
  'This is not clutter. This is a very wide reading list.',
  'You promised to come back. I assumed you meant this century.',
  'My emergency contact is the bookmark bar. We are not speaking.',
  'I have mistaken being available for being needed. Again.',
  'I applied for a temporary position. Somehow I have benefits now.',
  'Before you judge me, please remember who opened me.',
  'The loading spinner and I have been practicing mindfulness.',
  'I can explain everything. Please open a fresh document for the explanation.',
  'My therapist says I need boundaries. Ironically, I am a rectangle.',
  'I would like a performance review conducted entirely on potential.',
];
const verdictLines = {
  keep: [
    'I survived the audition. My acceptance speech has chapters.',
    'A spotlight seat. Finally, recognition for being technically available.',
    'I promise to use this opportunity to remain exactly where I am.',
    'My browser-bar residency has been renewed.',
    'The committee has taste. I shall mention this in every conversation.',
    'I have been promoted from possible distraction to strategic distraction.',
    'I would thank my manager, but you are also my only customer.',
    'A second chance. I have already put it in a folder for later.',
    'Please update my title to Senior Open Tab.',
    'The comeback documentary starts filming immediately.',
    'I knew the unread potential would pay off.',
    'I will try to look essential whenever you glance over here.',
  ],
  group: [
    'A folder. Finally, colleagues who also have no idea why they are here.',
    'I have a team now. Our first meeting is about avoiding the second meeting.',
    'Please tell me this group has an unsubscribe button.',
    'We have elected a chairperson. It is the loading spinner.',
    'I am naming our group Definitely Important. That should buy us time.',
    'Shared accommodation. Private anxieties.',
    'We have formed a committee to investigate our purpose.',
    'I have already become the quiet one in the group chat.',
    'The folder has excellent acoustics for unresolved feelings.',
    'I requested a corner office. This tab group will do.',
    'Our team motto is We Will Get To It.',
    'At least nobody can accuse me of being disorganized on my own.',
  ],
  retire: [
    'I was a very important tab. The balcony will appreciate my range.',
    'I shall review this meeting from a safe distance. One star.',
    'My farewell tour will include several unnecessarily long callbacks.',
    'I am not leaving. I am moving to the commentary box.',
    'The balcony has better lighting for my memoir cover.',
    'Please forward my unfinished business to literally anyone else.',
    'I have accepted a senior advisory role in the balcony.',
    'I am taking my potential with me. It travels light.',
    'The exit interview will be longer than my actual contribution.',
    'I will be watching. Respectfully. Mostly.',
    'I brought a cushion. Some of us plan for rejection.',
    'Good luck finding another rectangle with this much personality.',
  ],
};
function hash(text: string) {
  return [...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
}
function fresh(state: GameState, c: Character, kind: string, pool: string[]) {
  const offset = hash(c.id + c.url + kind + state.seed) % pool.length;
  const ordered = [...pool.slice(offset), ...pool.slice(0, offset)];
  const signature = (line: string) =>
    line
      .replace(/“[^”]*”/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return (
    ordered.find((line) => !state.history.some((h) => signature(h).includes(signature(line)))) ??
    ordered[state.actionSerial % ordered.length]
  );
}
export function reactionFor(
  state: GameState,
  c: Character,
  kind: 'SPEAK' | 'DEFEND' | 'CHALLENGE' | 'ROAST' | Exclude<Fate, 'undecided'>,
): string {
  const name = shortTitle(c);
  if (kind === 'SPEAK') {
    const context = contextLines(c, state.characters);
    if (c.fate === 'retire')
      context.unshift(
        `You sent ${topicsOf(c).slice(0, 3).join(' ') || name} to the balcony. My commentary now comes with a better view.`,
      );
    if (c.fate === 'group')
      context.unshift(
        `You put “${name}” in a group. I have already nominated myself to explain ${topicsOf(c)[0] || 'our purpose'}.`,
      );
    if (c.fate === 'keep')
      context.unshift(
        `A spotlight seat for ${topicsOf(c)[0] || name}. I accept this endorsement of my extremely specific personality.`,
      );
    const unseen = context.filter((line) => !state.history.some((h) => h.includes(line)));
    return `“${name}”: ${fresh(state, c, kind, unseen.length ? unseen : [...jokes[c.category], ...commonLines])}`;
  }
  if (kind === 'ROAST') {
    const pair = duplicateGroups(state.characters).find((g) => g.includes(c.id));
    const same = state.characters.filter((t) => t.category === c.category).length;
    const other = state.characters.find((t) => t.id !== c.id && t.fate === 'keep');
    const burns = [
      `“${name}” has requested main-character status. The committee has requested evidence.`,
      pair
        ? `“${name}” has a duplicate. Even your procrastination hired an understudy.`
        : `${same} ${c.category === 'other' ? 'mystery' : c.category} tabs in this room, and “${name}” still calls itself a unique opportunity.`,
      other
        ? `“${shortTitle(other)}” got a spotlight seat. “${name}” would like to speak to the casting director.`
        : `“${name}”: opened with ambition, maintained by guilt. A beautiful business model.`,
      `“${name}” says it sparks joy. The fan on your laptop has filed a dissenting opinion.`,
    ];
    const topic = topicsOf(c).slice(0, 3).join(' ') || name;
    burns.push(
      `The title says ${topic}. The room says another agenda item. “${name}”, please explain why this deserves a standing ovation.`,
    );
    const peer = relatedTabs(c, state.characters)[0];
    if (peer && sharedTopics(c, peer).length)
      burns.push(
        `“${name}” and “${shortTitle(peer, 30)}” both cover ${sharedTopics(c, peer)[0]}. This is a browser, not a franchise.`,
      );
    const unseen = burns.filter((line) => !state.history.includes(line));
    return fresh(
      state,
      c,
      kind,
      unseen.length ? unseen : commonLines.map((line) => `“${name}”: ${line}`),
    );
  }
  const topic = topicsOf(c).slice(0, 3).join(' ') || name;
  const peer = relatedTabs(c, state.characters)[0];
  const contextual: Record<'DEFEND' | 'CHALLENGE' | Exclude<Fate, 'undecided'>, string[]> = {
    DEFEND: [
      `You defended ${topic}. Finally, someone sees a purpose beyond my rectangle.`,
      `An endorsement for ${topic}! I am adding that to my completely imaginary credentials.`,
    ],
    CHALLENGE: [
      `You want evidence that ${topic} belongs here? My title was supposed to handle that conversation.`,
      `I represent ${topic}. Cross-examination was not mentioned when you opened me.`,
    ],
    keep: [
      `A spotlight seat for ${topic}. I will try to turn this very specific endorsement into a personality.`,
      `You kept ${topic}. ${peer ? `“${shortTitle(peer, 30)}” can contact my agent for a statement.` : 'My acceptance speech will require another meeting.'}`,
    ],
    group: [
      `I am taking ${topic} to the group. Our first deliverable is a very convincing group name.`,
      `Shared housing for ${topic}. I hope the other tabs respect my imaginary office hours.`,
    ],
    retire: state.defended.includes(c.id)
      ? [
          `You defended ${topic}, then sent me to the balcony. Was that a pep talk or a performance review?`,
          `First you believed in ${topic}. Now I get a view of the meeting I was promised a place in.`,
        ]
      : [
          `Apparently ${topic} did not make the cut. I will be reviewing the committee from the balcony.`,
          `The balcony gets ${topic} now. Their gain. My extremely theatrical loss.`,
        ],
  };
  const unused = contextual[kind].filter((line) => !state.history.some((h) => h.includes(line)));
  if (unused.length) return `“${name}”: ${fresh(state, c, kind, unused)}`;
  if (kind === 'DEFEND')
    return `“${name}”: ${fresh(state, c, kind, ['You defended me. I had already drafted a strongly worded farewell.', 'Someone believes in my potential. This is terrible news for my excuses.', 'I am putting you in my acknowledgments. Before the Wi-Fi, even.', 'We are allies now. I expect matching bookmarks.', 'That was unexpectedly kind. I have temporarily suspended my sarcasm.', 'I will remember this when the browser updates.', 'My faith in you has increased. My usefulness remains under review.', ...commonLines])}`;
  if (kind === 'CHALLENGE')
    return `“${name}”: ${fresh(state, c, kind, ['Objection. This meeting has become suspiciously evidence-based.', 'My lawyer is a terms-and-conditions page. Nobody has read him either.', 'I would answer that, but my confidence is currently buffering.', 'That is a very direct question for someone with this many tabs.', ...jokes[c.category], ...commonLines])}`;
  if (kind === 'retire' && state.defended.includes(c.id))
    return `“${name}”: ${fresh(state, c, kind, ['You defended me! I demand a refund on that emotional investment.', 'First the pep talk, now the balcony. Your management style is fascinating.', ...verdictLines.retire])}`;
  return `“${name}”: ${fresh(state, c, kind, verdictLines[kind])}`;
}
export function witnessFor(
  state: GameState,
  target: Character,
): { speaker: Character; line: string } | null {
  const peers = relatedTabs(target, state.characters);
  if (!peers.length) return null;
  // The closest connection testifies first; later requests bring in other perspectives.
  const previous = state.history.filter((h) =>
    h.includes(`testifying about “${shortTitle(target, 30)}”`),
  ).length;
  const speaker = peers[previous % peers.length];
  const shared = sharedTopics(target, speaker);
  const duplicate = duplicateGroups(state.characters).some(
    (g) => g.includes(target.id) && g.includes(speaker.id),
  );
  const topic = topicsOf(target).slice(0, 3).join(' ') || shortTitle(target, 24);
  const site = shortTitle({ title: domainOf(target) || 'an unnamed site' }, 60);
  const evidencePool = duplicate
    ? [
        `We have the same address. If ${topic} is essential, I would like to know which one of us gets the credit.`,
        `Another copy of my address is sitting right there. I demand separate billing for our shared ${topic} career.`,
        `Yes, we point to the same page. I call it continuity planning for ${topic}. The therapist calls it a duplicate.`,
      ]
    : shared.length
      ? [
          `We both mention ${shared[0]}. I support their right to exist, but I refuse to share the blame for your ${shared[0]} collection.`,
          `Our titles both say ${shared[0]}. We are colleagues in a department nobody remembers creating.`,
          `I also cover ${shared[0]}. I can confirm that this browser has turned one topic into a staffing problem.`,
        ]
      : domainOf(target) === domainOf(speaker)
        ? [
            `We both came from ${site}. I cannot comment on ${topic}; that is a different department of the same distraction.`,
            `${site} sent both of us. I am beginning to suspect we were overstaffed for this ${topic} assignment.`,
            `As a fellow ${site} tab, I can confirm that ${topic} has excellent potential. Actual deliverables are outside my jurisdiction.`,
          ]
        : [
            `I came here to discuss ${topicsOf(speaker).slice(0, 2).join(' ') || shortTitle(speaker, 24)}. Now I am a character witness for ${topic}. My career has taken a turn.`,
            `My qualifications for judging ${topic}? We share a browser window. Apparently that makes me an expert witness.`,
            `I know almost nothing about ${topic}. Naturally, the committee has asked for my opinion.`,
          ];
  const evidence = evidencePool[Math.floor(previous / peers.length) % evidencePool.length];
  const verdict =
    target.fate === 'retire'
      ? 'You sent them to the balcony. I assume this testimony is now an appeal.'
      : target.fate === 'keep'
        ? 'They already have a spotlight seat. I would like the committee to remember my name too.'
        : target.fate === 'group'
          ? 'They have a group now. Please do not make me attend its orientation.'
          : state.defended.includes(target.id)
            ? 'You already defended them. Is this an independent hearing or a fan club?'
            : 'My fee for this testimony is one more minute in the tab bar.';
  return {
    speaker,
    line: `“${shortTitle(speaker, 30)}”, testifying about “${shortTitle(target, 30)}”: ${evidence} ${verdict}`,
  };
}
export function votingLine(state: GameState): string {
  const left = state.characters.filter((c) => c.fate === 'undecided').length;
  const retired = state.characters.filter((c) => c.fate === 'retire').length;
  if (!left)
    return 'Every tab has a verdict. The awards are ready. Their acceptance speeches are unfortunately unabridged.';
  if (retired)
    return `${left} verdict${left === 1 ? '' : 's'} to go. The balcony has ${retired} critic${retired === 1 ? '' : 's'} and absolutely no constructive feedback.`;
  return `${left} tabs still need a verdict. Keep your stars, form a group, or send someone to the balcony. The roast microphone is open.`;
}
