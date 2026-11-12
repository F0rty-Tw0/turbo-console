import type { Mock } from 'vitest';

import type { InputAsk, OptionItem, RunOption, RunOptionsPorts } from '../../common/run-options.type.ts';
import type { RunRequest } from '../../common/run.type.ts';

export type RunOptionsFakes = {
  readonly ports: RunOptionsPorts;
  readonly pickMany: Mock<(items: OptionItem[], placeholder: string) => Promise<OptionItem[] | undefined>>;
  readonly input: Mock<(ask: InputAsk) => Promise<string | undefined>>;
  readonly info: Mock<(text: string) => void>;
  readonly run: Mock<(request: RunRequest) => Promise<void>>;
  /** What the next pickers return, in order: the offered items whose option is listed; `undefined` (or none left) closes it. */
  readonly choose: (...picks: (RunOption[] | undefined)[]) => void;
  /** The texts the next boxes return, in order; `undefined` (or none left) closes the box. */
  readonly answer: (...texts: (string | undefined)[]) => void;
};
