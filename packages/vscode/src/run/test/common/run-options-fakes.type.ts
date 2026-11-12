import type { Mock } from 'vitest';

import type { InputAsk, RunOption, RunOptionsPorts } from '../../common/run-options.type.ts';
import type { RunRequest } from '../../common/run.type.ts';

export type RunOptionsFakes = {
  readonly ports: RunOptionsPorts;
  readonly pickMany: Mock<RunOptionsPorts['pickMany']>;
  readonly input: Mock<RunOptionsPorts['input']>;
  readonly info: Mock<RunOptionsPorts['info']>;
  readonly run: Mock<RunOptionsPorts['run']>;
  /** What the next pickers return, in order: the offered items whose option is listed; `undefined` (or none left) closes it. */
  readonly choose: (...picks: (RunOption[] | undefined)[]) => void;
  /** The texts the next boxes return, in order; `undefined` (or none left) closes the box. */
  readonly answer: (...texts: (string | undefined)[]) => void;
  /** The ask of box `index` (0 is the first box opened); throws when fewer boxes opened. */
  readonly askOf: (index: number) => InputAsk;
  /** The request of the one run; throws unless `run` was called exactly once. */
  readonly launched: () => RunRequest;
};
