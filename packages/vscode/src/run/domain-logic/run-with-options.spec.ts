import type { PackageNode, RunExtras, TaskNode } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import { runWithOptions } from './run-with-options.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { TASK_TREE_NODE_STUB, TREE_NODE_STUB } from '../../tree/test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import { ARGS_PLACEHOLDER, CONCURRENCY_MESSAGE, CONCURRENCY_PLACEHOLDER, CONCURRENCY_PROMPT } from '../common/run-options.const.ts';
import type { OptionItem } from '../common/run-options.type.ts';
import { ALREADY_RUNNING_TEXT } from '../common/run.const.ts';
import type { RunRequest, Terminable } from '../common/run.type.ts';
import type { RunOptionsFakes } from '../test/common/run-options-fakes.type.ts';
import { PLAIN_REQUEST } from '../test/common/run-options.const.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';
import { loadedAt, runOptionsFakes } from '../test/utils/run-options-fakes.spec.util.ts';
import { optionItemsOf } from '../utils/option-items.util.ts';
import { argsErrorText, pickerPlaceholderOf, turboArgsPromptOf } from '../utils/run-options-text.util.ts';

const FORCED: RunRequest = { ...PLAIN_REQUEST, force: true };

const ONLY_EXTRAS: RunExtras = { only: true };

const KEEP_EXTRAS: RunExtras = { continueMode: 'dependencies-successful' };

const TRIMMED_EXTRAS: RunExtras = { concurrency: '4' };

const ALL_EXTRAS: RunExtras = {
  only: true,
  continueMode: 'dependencies-successful',
  concurrency: '50%',
  passThrough: ['--watch']
};

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

const SCRIPT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [SCRIPT_TASK] };

const UMBRELLA_TASK: TaskNode = { ...TASK_NODE_STUB, kind: 'atom-umbrella' };

const UMBRELLA_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [UMBRELLA_TASK] };

const EMPTY_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [] };

describe('FEATURE: Run with Options on a turbo task', () => {
  let roots: RootStore;
  let fakes: RunOptionsFakes;

  const invokeOn = async (arg: unknown): Promise<void> => runWithOptions(roots, fakes.ports, arg);
  const invoke = async (): Promise<void> => invokeOn(TASK_TREE_NODE_STUB);

  beforeEach(() => {
    roots = new RootStore();
    fakes = runOptionsFakes();
    roots.set([ROOT_FOLDER_STUB], coordinatorMock);
    roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));
  });

  describe('GIVEN a root with a binary and package a holding the build task', () => {
    it('WHEN it is invoked THEN the picker gets the option items and the placeholder of the task', async () => {
      const items = optionItemsOf(TASK_NODE_STUB);
      const placeholder = pickerPlaceholderOf('build', 'a');

      await invoke();

      expect(fakes.pickMany).toHaveBeenCalledExactlyOnceWith(items, placeholder);
    });

    it('WHEN the pick is empty THEN run gets the plain request with no extras key and no box opens', async () => {
      fakes.choose([]);

      await invoke();

      expect(fakes.launched()).toStrictEqual(PLAIN_REQUEST);
      expect(fakes.input).not.toHaveBeenCalled();
    });

    it('WHEN only Without cache is picked THEN run gets the request with force and no extras key', async () => {
      fakes.choose(['force']);

      await invoke();

      expect(fakes.launched()).toStrictEqual(FORCED);
    });

    it('WHEN only Only is picked THEN run gets extras with only', async () => {
      fakes.choose(['only']);

      await invoke();

      expect(fakes.launched()).toStrictEqual({ ...PLAIN_REQUEST, extras: ONLY_EXTRAS });
    });

    it('WHEN only Keep going is picked THEN run gets extras with the continue mode', async () => {
      fakes.choose(['continue']);

      await invoke();

      expect(fakes.launched()).toStrictEqual({ ...PLAIN_REQUEST, extras: KEEP_EXTRAS });
    });

    describe('WHEN all five are picked and the boxes answer 50% and --watch', () => {
      beforeEach(async () => {
        fakes.choose(['force', 'only', 'continue', 'concurrency', 'passThrough']);
        fakes.answer('50%', '--watch');

        await invoke();
      });

      it('THEN run gets force and all four extras', () => {
        expect(fakes.launched()).toStrictEqual({ ...FORCED, extras: ALL_EXTRAS });
      });

      it('THEN the boxes were asked concurrency first, then the arguments', () => {
        const expected = [CONCURRENCY_PROMPT, turboArgsPromptOf('build')];

        const prompts = fakes.input.mock.calls.map((call) => call[0].prompt);

        expect(prompts).toStrictEqual(expected);
      });
    });

    it('WHEN Extra arguments is picked and the box answers nothing THEN run gets the plain request', async () => {
      fakes.choose(['passThrough']);
      fakes.answer('');

      await invoke();

      expect(fakes.launched()).toStrictEqual(PLAIN_REQUEST);
    });

    describe('WHEN the concurrency box answers with spaces around 4', () => {
      beforeEach(async () => {
        fakes.choose(['concurrency']);
        fakes.answer(' 4 ');

        await invoke();
      });

      it('THEN extras holds the trimmed 4', () => {
        expect(fakes.launched()).toStrictEqual({ ...PLAIN_REQUEST, extras: TRIMMED_EXTRAS });
      });

      it('THEN the box shows the concurrency placeholder', () => {
        const ask = fakes.askOf(0);

        expect(ask.placeholder).toBe(CONCURRENCY_PLACEHOLDER);
      });

      it('THEN the box accepts the spaced 4', () => {
        const ask = fakes.askOf(0);
        const error = ask.validate(' 4 ');

        expect(error).toBeNull();
      });

      it('THEN the box rejects 0', () => {
        const ask = fakes.askOf(0);
        const error = ask.validate('0');

        expect(error).toBe(CONCURRENCY_MESSAGE);
      });
    });

    describe('WHEN Extra arguments is picked and its box is asked', () => {
      beforeEach(async () => {
        fakes.choose(['passThrough']);

        await invoke();
      });

      it('THEN the box shows the arguments placeholder', () => {
        const ask = fakes.askOf(0);

        expect(ask.placeholder).toBe(ARGS_PLACEHOLDER);
      });

      it('THEN the box names the first bad argument', () => {
        const expected = argsErrorText(1, 'a,b');

        const ask = fakes.askOf(0);
        const error = ask.validate('a,b');

        expect(error).toBe(expected);
      });

      it('THEN the box accepts plain arguments', () => {
        const ask = fakes.askOf(0);
        const error = ask.validate('--a --b');

        expect(error).toBeNull();
      });
    });
  });

  describe('GIVEN a box or the picker is closed', () => {
    it('WHEN the picker is closed THEN no box opens, nothing runs and no notice shows', async () => {
      fakes.choose(undefined);

      await invoke();

      expect(fakes.input).not.toHaveBeenCalled();
      expect(fakes.run).not.toHaveBeenCalled();
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN the concurrency box is closed THEN the arguments box is not asked and nothing runs', async () => {
      fakes.choose(['concurrency', 'passThrough']);
      fakes.answer(undefined);

      await invoke();

      expect(fakes.input).toHaveBeenCalledOnce();
      expect(fakes.run).not.toHaveBeenCalled();
    });

    it('WHEN the arguments box is closed after a valid concurrency THEN nothing runs and no notice shows', async () => {
      fakes.choose(['concurrency', 'passThrough']);
      fakes.answer('4', undefined);

      await invoke();

      expect(fakes.run).not.toHaveBeenCalled();
      expect(fakes.info).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the root changes while the picker is open', () => {
    const changeDuring = (change: () => void): void => {
      const pickAfterChange = async (): Promise<OptionItem[]> => {
        change();

        return Promise.resolve([]);
      };

      fakes.pickMany.mockImplementationOnce(pickAfterChange);
    };

    it('WHEN the root is removed THEN nothing runs and no notice shows', async () => {
      changeDuring(() => {
        roots.set([], coordinatorMock);
      });

      await invoke();

      expect(fakes.run).not.toHaveBeenCalled();
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN the task is gone from the model THEN nothing runs and no notice shows', async () => {
      changeDuring(() => {
        roots.apply('/ws', loadedWith([EMPTY_PACKAGE]));
      });

      await invoke();

      expect(fakes.run).not.toHaveBeenCalled();
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN the task turns into a script THEN nothing runs and no notice shows', async () => {
      changeDuring(() => {
        roots.apply('/ws', loadedWith([SCRIPT_PACKAGE]));
      });

      await invoke();

      expect(fakes.run).not.toHaveBeenCalled();
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN the task turns into an Atomizer umbrella THEN nothing runs and no notice shows', async () => {
      changeDuring(() => {
        roots.apply('/ws', loadedWith([UMBRELLA_PACKAGE]));
      });

      await invoke();

      expect(fakes.run).not.toHaveBeenCalled();
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN a second state lands with another binary THEN run gets that binary', async () => {
      changeDuring(() => {
        roots.apply('/ws', loadedAt([PACKAGE_NODE_STUB], '/other/turbo'));
      });

      await invoke();

      expect(fakes.launched()).toStrictEqual({ ...PLAIN_REQUEST, binaryPath: '/other/turbo' });
    });
  });

  describe('GIVEN there is nothing to run', () => {
    it('WHEN the root has no binary and its load settles THEN no picker, no box and no run', async () => {
      const loaded = loadedWith([PACKAGE_NODE_STUB]);

      roots.apply('/ws', { ...loaded, binary: null });
      vi.mocked(roots.get('/ws')?.coordinator.whenSettled ?? vi.fn()).mockResolvedValue(undefined);

      await invoke();

      expect(fakes.pickMany).not.toHaveBeenCalled();
      expect(fakes.input).not.toHaveBeenCalled();
      expect(fakes.run).not.toHaveBeenCalled();
    });

    it('WHEN it is invoked from the palette THEN nothing happens', async () => {
      await invokeOn(undefined);

      expect(fakes.pickMany).not.toHaveBeenCalled();
    });

    it('WHEN it is invoked on a package row THEN nothing happens', async () => {
      await invokeOn(TREE_NODE_STUB);

      expect(fakes.pickMany).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN VS Code already runs the task', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('WHEN the picks are accepted THEN the run flow shows the already-running notice and does not execute', async () => {
      const execution: Terminable = { terminate: vi.fn() };
      const isActive = vi.fn().mockReturnValue(true);
      const runPorts = fakeRunPorts(execution, { isActive });
      const store = new RunStore();

      fakes.run.mockImplementation(async (request) => runTask(store, runPorts, request));
      fakes.choose([]);

      await invoke();

      expect(runPorts.info).toHaveBeenCalledExactlyOnceWith(ALREADY_RUNNING_TEXT);
      expect(runPorts.execute).not.toHaveBeenCalled();
    });
  });
});
