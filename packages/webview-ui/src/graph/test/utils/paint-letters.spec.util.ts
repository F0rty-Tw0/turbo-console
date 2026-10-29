import type { ProbeState } from '../../common/graph-probe.type.ts';

const LETTERS = new Map<ProbeState, string>([
  ['normal', 'n'],
  ['selected', 's'],
  ['highlighted', 'h'],
  ['dimmed', 'd']
]);

export const lettersOf = (states: ProbeState[]): string => {
  const letters = states.map((state: ProbeState): string => LETTERS.get(state) ?? '?');

  return letters.join('');
};
