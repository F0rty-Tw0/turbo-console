import type { Runs } from '../../run/common/run.type.ts';

/** The part of `Runs` the elapsed ticker reads: every change of a run entry. */
export type RunChanges = Pick<Runs, 'onDidChange'>;

/** The ticker's clock and refresh: `every` arms an interval and returns its clear; `fire` redraws one task's row. */
export type TickerPorts = {
  readonly every: (ms: number, tick: () => void) => () => void;
  readonly fire: (root: string, taskId: string) => void;
};
