import type { RunEntry } from '../../../run/common/run.type.ts';
import type { RunChanges } from '../../common/ticker.type.ts';
import type { VisibleView } from '../../common/visible-view.type.ts';

/** A Packages view whose visibility a spec sets: `setVisible` updates `visible`, then fires `onDidChangeVisibility`. */
export type VisibleViewFake = {
  readonly view: VisibleView;
  readonly setVisible: (visible: boolean) => void;
};

/** A run store whose entry changes a spec emits by hand. */
export type RunChangesFake = {
  readonly runs: RunChanges;
  readonly emit: (entry: RunEntry) => void;
};
