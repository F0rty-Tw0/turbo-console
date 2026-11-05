import type { RunLogTail } from '../../common/run-log-tail.type.ts';

/** A tail handle whose `drain` resolves only after `finishDrain`; `drains` and `closes` count the calls it got. */
export type FakeRunLogTail = {
  readonly handle: RunLogTail;
  readonly drains: number;
  readonly closes: number;
  readonly finishDrain: () => void;
};
