import type { PackageNode } from '@turbo-console/core';
import { vi } from 'vitest';

import type { LoadedModel } from '../../../roots/common/root.type.ts';
import { turboBinaryAt } from '../../../roots/test/utils/turbo-binary.spec.util.ts';
import { loadedWith } from '../../../tree/test/utils/tree-model.spec.util.ts';
import type { InputAsk, OptionItem, RunOption, RunOptionsPorts } from '../../common/run-options.type.ts';
import type { RunRequest } from '../../common/run.type.ts';
import type { RunOptionsFakes } from '../common/run-options-fakes.type.ts';

/** `loadedWith(packages)` whose binary lives at `binaryPath`. */
export const loadedAt = (packages: PackageNode[], binaryPath: string): LoadedModel => {
  const loaded = loadedWith(packages);
  const binary = turboBinaryAt(binaryPath);
  const at: LoadedModel = { ...loaded, binary };

  return at;
};

/**
 * Run with Options ports where `choose` answers the pickers and `answer` the boxes (a closed one once its queue is empty),
 * the boxes do not validate (VS Code never hands back an invalid text), and `run` resolves.
 */
export const runOptionsFakes = (): RunOptionsFakes => {
  const picks: (RunOption[] | undefined)[] = [];
  const texts: (string | undefined)[] = [];
  const pickNext = async (items: OptionItem[]): Promise<OptionItem[] | undefined> => {
    const listed = picks.shift();

    if (listed === undefined) return Promise.resolve(undefined);

    const chosen = items.filter((item) => listed.includes(item.option));

    return Promise.resolve(chosen);
  };
  const pickMany = vi.fn<RunOptionsPorts['pickMany']>(pickNext);
  const input = vi.fn<RunOptionsPorts['input']>(async () => Promise.resolve(texts.shift()));
  const info = vi.fn<RunOptionsPorts['info']>();
  const run = vi.fn<RunOptionsPorts['run']>().mockResolvedValue(undefined);
  const choose = (...next: (RunOption[] | undefined)[]): void => {
    picks.push(...next);
  };
  const answer = (...next: (string | undefined)[]): void => {
    texts.push(...next);
  };
  const askOf = (index: number): InputAsk => {
    const ask = input.mock.calls[index]?.[0];

    if (ask === undefined) throw new Error(`box ${index} was not asked`);

    return ask;
  };
  const launched = (): RunRequest | undefined => run.mock.calls[0]?.[0];
  const ports: RunOptionsPorts = { pickMany, input, info, run };
  const fakes: RunOptionsFakes = { ports, pickMany, input, info, run, choose, answer, askOf, launched };

  return fakes;
};
