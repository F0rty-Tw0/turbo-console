import type { Mock, Mocked } from 'vitest';

import type { AtomChipsPort } from '../../common/atom-chips.type.ts';
import type { AtomGroupsDeps } from '../../common/graph-atom.type.ts';
import type { AtomCanvas, TaskCanvas } from '../../common/task-canvas.type.ts';

/** The deps of a `GraphAtomGroups` under test and the doubles behind them. */
export type AtomRig = {
  readonly deps: AtomGroupsDeps;
  readonly tasks: Mocked<TaskCanvas>;
  readonly atoms: Mocked<AtomCanvas>;
  readonly viewport: Mock<AtomGroupsDeps['view']['viewport']>;
  readonly post: Mock<AtomGroupsDeps['bridge']['post']>;
  readonly now: Mock<AtomGroupsDeps['now']>;
  /** The chip rows' layer and builder. */
  readonly chips: AtomChipsPort;
};
