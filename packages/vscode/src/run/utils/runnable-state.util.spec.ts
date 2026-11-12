import type { TurboBinary } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runnableStateOf } from './runnable-state.util.ts';
import type { Coordinator, RootChange, RootEntry, RootState, Roots } from '../../roots/common/coordinator.type.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { RunDefinition, TaskTarget } from '../common/run.type.ts';

const CHANGE: RootChange = { root: '/ws', before: null, after: null, errorBefore: null, errorAfter: null };

const DEFINITION: RunDefinition = { root: '/ws', id: 'build' };

const TARGET: TaskTarget = { definition: DEFINITION, packageName: 'a' };

describe('FEATURE: the runnable state of a task root', () => {
  let binary: TurboBinary | null;
  let isPresent: boolean;
  let listeners: Set<(change: RootChange) => void>;
  let roots: Roots;
  let coordinator: Coordinator;

  const publish = (next: TurboBinary): void => {
    binary = next;

    for (const listener of listeners) listener(CHANGE);
  };

  beforeEach(() => {
    binary = null;
    isPresent = true;
    listeners = new Set();
    coordinator = coordinatorMock();

    const get = (): RootEntry | undefined => {
      if (!isPresent) return undefined;

      const state: RootState = { ...ROOT_STATE_STUB, binary };
      const entry: RootEntry = { state, coordinator };

      return entry;
    };
    const onDidChange: Roots['onDidChange'] = (listener) => {
      listeners.add(listener);

      return (): void => {
        listeners.delete(listener);
      };
    };

    roots = { get, all: (): RootEntry[] => [], onDidChange };
  });

  it('GIVEN the root is absent WHEN its state is read THEN it is undefined', async () => {
    isPresent = false;

    const state = await runnableStateOf(roots, TARGET);

    expect(state).toBeUndefined();
  });

  it('GIVEN a root with a binary WHEN its state is read THEN it holds the binary and the load is not awaited', async () => {
    binary = TURBO_BINARY_STUB;

    const state = await runnableStateOf(roots, TARGET);

    expect(state?.binary).toBe(TURBO_BINARY_STUB);
    expect(coordinator.whenSettled).not.toHaveBeenCalled();
  });

  it('GIVEN a root without a binary and a load that never settles WHEN the binary is published THEN it resolves with it', async () => {
    vi.mocked(coordinator.whenSettled).mockReturnValue(new Promise(() => undefined));

    const reading = runnableStateOf(roots, TARGET);

    publish(TURBO_BINARY_STUB);

    const state = await reading;

    expect(state?.binary).toBe(TURBO_BINARY_STUB);
  });
});
