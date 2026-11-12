import type { PackageNode, RunExtras, TaskNode } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { runWithOptions } from './run-with-options.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { TASK_TREE_NODE_STUB } from '../../tree/test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import { ARGS_PLACEHOLDER } from '../common/run-options.const.ts';
import type { RunRequest } from '../common/run.type.ts';
import type { RunOptionsFakes } from '../test/common/run-options-fakes.type.ts';
import { PLAIN_REQUEST } from '../test/common/run-options.const.ts';
import { runOptionsFakes } from '../test/utils/run-options-fakes.spec.util.ts';
import { argsErrorText, scriptArgsPromptOf } from '../utils/run-options-text.util.ts';
import { unsafeScriptText } from '../utils/run-text.util.ts';

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

const SCRIPT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [SCRIPT_TASK] };

const SCRIPT_REQUEST: RunRequest = { ...PLAIN_REQUEST, task: SCRIPT_TASK };

const UNSAFE_TASK: TaskNode = { ...SCRIPT_TASK, name: 'a b' };

const UNSAFE_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [UNSAFE_TASK] };

const NO_BODY_TASK: TaskNode = { ...SCRIPT_TASK, command: null };

const NO_BODY_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [NO_BODY_TASK] };

const WATCH_EXTRAS: RunExtras = { passThrough: ['--watch', '--port=3000'] };

describe('FEATURE: Run with Options on a package script', () => {
  let roots: RootStore;
  let fakes: RunOptionsFakes;

  const invoke = async (): Promise<void> => runWithOptions(roots, fakes.ports, TASK_TREE_NODE_STUB);

  beforeEach(() => {
    roots = new RootStore();
    fakes = runOptionsFakes();
    roots.set([ROOT_FOLDER_STUB], coordinatorMock);
  });

  describe('GIVEN a script row of a package run with pnpm', () => {
    beforeEach(() => {
      roots.apply('/ws', loadedWith([SCRIPT_PACKAGE]));
    });

    it('WHEN it is invoked THEN no picker opens and the box asks for the script arguments', async () => {
      await invoke();

      const ask = fakes.askOf(0);

      expect(fakes.pickMany).not.toHaveBeenCalled();
      expect(ask.prompt).toBe(scriptArgsPromptOf('pnpm', 'build'));
      expect(ask.placeholder).toBe(ARGS_PLACEHOLDER);
    });

    it('WHEN the box answers two arguments THEN run gets them as pass-through without force', async () => {
      fakes.answer('--watch --port=3000');

      await invoke();

      expect(fakes.launched()).toStrictEqual({ ...SCRIPT_REQUEST, extras: WATCH_EXTRAS });
    });

    it('WHEN the box answers nothing THEN run gets the plain request with no extras key', async () => {
      fakes.answer('');

      await invoke();

      expect(fakes.launched()).toStrictEqual(SCRIPT_REQUEST);
    });

    it('WHEN the box is closed THEN nothing runs', async () => {
      fakes.answer(undefined);

      await invoke();

      expect(fakes.run).not.toHaveBeenCalled();
    });

    it('WHEN the box is asked THEN it rejects a shell variable by naming the first argument', async () => {
      await invoke();

      const ask = fakes.askOf(0);

      expect(ask.validate('$HOME')).toBe(argsErrorText(1, '$HOME'));
    });

    it('WHEN the script turns into a turbo task during the box THEN nothing runs and no notice shows', async () => {
      fakes.input.mockImplementationOnce(async () => {
        roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));

        return Promise.resolve('--watch');
      });

      await invoke();

      expect(fakes.run).not.toHaveBeenCalled();
      expect(fakes.info).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a script that must not run', () => {
    it('WHEN its name needs quoting THEN the notice shows and no box opens', async () => {
      roots.apply('/ws', loadedWith([UNSAFE_PACKAGE]));

      await invoke();

      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(unsafeScriptText('a b'));
      expect(fakes.input).not.toHaveBeenCalled();
    });

    it('WHEN it has no command THEN the notice shows and no box opens', async () => {
      roots.apply('/ws', loadedWith([NO_BODY_PACKAGE]));

      await invoke();

      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(unsafeScriptText('build'));
      expect(fakes.input).not.toHaveBeenCalled();
    });
  });

  it('GIVEN a root with no binary WHEN a script row is invoked THEN no box opens and nothing runs', async () => {
    const loaded = loadedWith([SCRIPT_PACKAGE]);

    roots.apply('/ws', { ...loaded, binary: null });

    await invoke();

    expect(fakes.input).not.toHaveBeenCalled();
    expect(fakes.run).not.toHaveBeenCalled();
  });
});
