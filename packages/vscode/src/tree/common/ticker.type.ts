import type { RunningTasks } from './tree-node.type.ts';
import type { Runs } from '../../run/common/run.type.ts';

/** The part of `Runs` the elapsed ticker reads: every change of a run entry. */
export type RunChanges = Pick<Runs, 'onDidChange'>;

/**
 * The ticker's clock and refresh: `every` arms an interval and returns its clear; `fire` redraws the rows of every
 * running task in one go. `fire` reads `running` before it returns and keeps no reference to it.
 */
export type TickerPorts = {
  readonly every: (ms: number, tick: () => void) => () => void;
  readonly fire: (running: RunningTasks) => void;
};
