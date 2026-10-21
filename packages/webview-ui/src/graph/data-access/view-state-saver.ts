import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';

const noTimer = (): void => undefined;

/** Saves the latest scheduled state `delayMs` after the last `schedule`, or at once on `flush`; never twice. */
export const createViewStateSaver = (save: (state: GraphViewState) => void, delayMs: number): ViewStateSaver => {
  let pending: GraphViewState | null = null;
  let cancelTimer = noTimer;
  const flush = (): void => {
    cancelTimer();
    cancelTimer = noTimer;

    if (pending === null) return;

    const state = pending;

    pending = null;
    save(state);
  };
  const schedule = (state: GraphViewState): void => {
    cancelTimer();
    pending = state;

    const timer = setTimeout(flush, delayMs);

    cancelTimer = (): void => clearTimeout(timer);
  };
  const saver: ViewStateSaver = { schedule, flush };

  return saver;
};
