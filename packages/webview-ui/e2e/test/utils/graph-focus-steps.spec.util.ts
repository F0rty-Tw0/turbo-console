import type { FocusStep } from '../../common/graph.type.ts';

const tabStopOf = (focus: string): FocusStep => {
  const step: FocusStep = { key: 'Tab', focus };

  return step;
};

/** One Tab press per name, each expected to leave the control with that accessible name focused. */
export const tabStopsOf = (names: string[]): FocusStep[] => names.map(tabStopOf);
