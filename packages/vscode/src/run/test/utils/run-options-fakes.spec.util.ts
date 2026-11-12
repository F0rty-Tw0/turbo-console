import type { PackageNode, TurboBinary } from '@turbo-console/core';
import { vi } from 'vitest';

import type { LoadedModel } from '../../../roots/common/root.type.ts';
import { TURBO_BINARY_STUB } from '../../../roots/test/stubs/root.stub.ts';
import { loadedWith } from '../../../tree/test/utils/tree-model.spec.util.ts';
import type { InputAsk, OptionItem, RunOption, RunOptionsPorts } from '../../common/run-options.type.ts';
import type { RunRequest } from '../../common/run.type.ts';
import type { RunOptionsFakes } from '../common/run-options-fakes.type.ts';

/** `loadedWith(packages)` whose binary lives at `binaryPath`. */
export const loadedAt = (packages: PackageNode[], binaryPath: string): LoadedModel => {
  const loaded = loadedWith(packages);
  const fields = { ...TURBO_BINARY_STUB, path: binaryPath };
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- core exports TurboBinary type-only and its #brand makes a literal unassignable; no production path builds one in a spec.
  const binary = fields as TurboBinary;
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
  const pickMany = vi.fn<(items: OptionItem[], placeholder: string) => Promise<OptionItem[] | undefined>>(async (items) => {
    const listed = picks.shift();

    if (listed === undefined) return Promise.resolve(undefined);

    const chosen = items.filter((item) => listed.includes(item.option));

    return Promise.resolve(chosen);
  });
  const input = vi.fn<(ask: InputAsk) => Promise<string | undefined>>(async () => Promise.resolve(texts.shift()));
  const info = vi.fn<(text: string) => void>();
  const run = vi.fn<(request: RunRequest) => Promise<void>>().mockResolvedValue(undefined);
  const choose = (...next: (RunOption[] | undefined)[]): void => {
    picks.push(...next);
  };
  const answer = (...next: (string | undefined)[]): void => {
    texts.push(...next);
  };
  const ports: RunOptionsPorts = { pickMany, input, info, run };
  const fakes: RunOptionsFakes = { ports, pickMany, input, info, run, choose, answer };

  return fakes;
};
