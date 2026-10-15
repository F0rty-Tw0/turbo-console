import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunAllGuard, runAll } from './run-all.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { PACKAGE_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import type { RunAllDefinition, RunAllRequest } from '../common/run-all.type.ts';
import { ALREADY_RUNNING_TEXT, START_TIMEOUT_MS, START_TIMEOUT_TEXT } from '../common/run.const.ts';
import type { Terminable } from '../common/run.type.ts';
import type { RunAllFakes } from '../test/common/run-all-fakes.type.ts';
import { runAllFakes } from '../test/utils/run-all-ports.spec.util.ts';
import { runAllKey } from '../utils/run-all-task.util.ts';

const EVERYWHERE: RunAllRequest = { affected: false };

const BUILD: RunAllDefinition = { root: '/one', id: '*build', affected: false };

describe('FEATURE: run all, a start that never happens', () => {
  let roots: RootStore;
  let guard: RunAllGuard;
  let fakes: RunAllFakes;

  const isHeld = (): boolean => !guard.tryAdd(runAllKey('/one', 'build', false));

  beforeEach(() => {
    vi.useFakeTimers();
    roots = new RootStore();
    roots.set([{ root: '/one', name: 'one' }], coordinatorMock);
    roots.apply('/one', loadedWith([PACKAGE_NODE_STUB]));
    guard = new RunAllGuard();
    fakes = runAllFakes();
    fakes.choose('build');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a run all whose task VS Code accepted', () => {
    beforeEach(async () => {
      await runAll(roots, guard, fakes.ports, EVERYWHERE);
    });

    describe('WHEN the start timeout passes before its process starts', () => {
      beforeEach(() => {
        vi.advanceTimersByTime(START_TIMEOUT_MS);
      });

      it('THEN the key is kept', () => {
        expect(isHeld()).toBe(true);
      });

      it('THEN nothing is logged', () => {
        expect(fakes.log).not.toHaveBeenCalled();
      });

      it('THEN its execution is not terminated', () => {
        expect(fakes.execution.terminate).not.toHaveBeenCalled();
      });

      it('THEN running it again says already running and launches nothing', async () => {
        fakes.choose('build');

        await runAll(roots, guard, fakes.ports, EVERYWHERE);

        expect(fakes.execute).toHaveBeenCalledOnce();
        expect(fakes.info).toHaveBeenCalledExactlyOnceWith(ALREADY_RUNNING_TEXT);
      });

      it('THEN its task end releases the key', () => {
        guard.releaseOn(BUILD);

        expect(isHeld()).toBe(false);
      });
    });
  });

  it('GIVEN a launch that never settles WHEN the start timeout passes THEN the key is released and the reason is logged', async () => {
    const launch = Promise.withResolvers<Terminable>();

    fakes.execute.mockReturnValue(launch.promise);
    void runAll(roots, guard, fakes.ports, EVERYWHERE);
    await vi.advanceTimersByTimeAsync(START_TIMEOUT_MS);

    expect(fakes.log).toHaveBeenCalledExactlyOnceWith(START_TIMEOUT_TEXT);
    expect(isHeld()).toBe(false);
  });

  describe('GIVEN a launch that hangs until the start timeout frees its key and a second launch takes it', () => {
    let hung: PromiseWithResolvers<Terminable>;

    beforeEach(async () => {
      hung = Promise.withResolvers<Terminable>();
      fakes.execute.mockReturnValueOnce(hung.promise);
      void runAll(roots, guard, fakes.ports, EVERYWHERE);
      await vi.advanceTimersByTimeAsync(START_TIMEOUT_MS);
      fakes.choose('build');
      await runAll(roots, guard, fakes.ports, EVERYWHERE);
    });

    it('WHEN the first launch then rejects THEN the second keeps the key', async () => {
      hung.reject(new Error('no folder'));
      await vi.advanceTimersByTimeAsync(0);

      expect(isHeld()).toBe(true);
    });

    it('WHEN the first launch then resolves and its task never starts THEN the second keeps the key and nothing is terminated', async () => {
      hung.resolve(fakes.execution);
      await vi.advanceTimersByTimeAsync(0);

      expect(isHeld()).toBe(true);
      expect(fakes.execution.terminate).not.toHaveBeenCalled();
    });
  });

  it('GIVEN a binary check that stays open until the key is freed and retaken WHEN it then says no THEN the retaken key stays', async () => {
    const check = Promise.withResolvers<boolean>();

    fakes.canExecute.mockReturnValueOnce(check.promise);
    void runAll(roots, guard, fakes.ports, EVERYWHERE);
    await vi.advanceTimersByTimeAsync(START_TIMEOUT_MS);
    fakes.choose('build');
    await runAll(roots, guard, fakes.ports, EVERYWHERE);
    check.resolve(false);
    await vi.advanceTimersByTimeAsync(0);

    expect(isHeld()).toBe(true);
  });

  it('GIVEN a launch that failed WHEN the start timeout passes THEN a run started since is not released', async () => {
    fakes.execute.mockRejectedValueOnce(new Error('no folder'));
    await runAll(roots, guard, fakes.ports, EVERYWHERE);
    fakes.log.mockClear();
    guard.tryAdd(runAllKey('/one', 'build', false));
    vi.advanceTimersByTime(START_TIMEOUT_MS);

    expect(isHeld()).toBe(true);
    expect(fakes.log).not.toHaveBeenCalled();
  });
});
