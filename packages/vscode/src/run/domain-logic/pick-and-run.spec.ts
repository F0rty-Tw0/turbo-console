import { TurboException } from '@turbo-console/core';
import type { TaskNode } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { pickAndRun } from './pick-and-run.ts';
import type { LoadFailure, RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { loadFailureOf } from '../../roots/test/utils/load-failure.spec.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import { NO_TASKS_TEXT } from '../common/picker.const.ts';
import type { RunRequest } from '../common/run.type.ts';
import type { PickerFakes } from '../test/common/picker-fakes.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { pickerFakes } from '../test/utils/picker-ports.spec.util.ts';

const ONE: RootFolder = { root: '/one', name: 'one' };
const TWO: RootFolder = { root: '/two', name: 'two' };

const requestOf = (root: string, packageName: string, task: TaskNode): RunRequest => {
  const packageDir = `${root}/${PACKAGE_NODE_STUB.path}`;
  const request: RunRequest = { ...RUN_REQUEST_STUB, root, packageName, packageDir, task, binaryPath: TURBO_BINARY_STUB.path };

  return request;
};

const binaryFailure: LoadFailure = loadFailureOf('binary', new TurboException('not-found', 'detail'));

describe('FEATURE: palette run picker', () => {
  let roots: RootStore;
  let fakes: PickerFakes;

  beforeEach(() => {
    roots = new RootStore();
    roots.set([ONE, TWO], coordinatorMock);
    fakes = pickerFakes([ONE, TWO]);
  });

  it('GIVEN two roots WHEN it starts THEN every root is asked to load at once, before any is answered', async () => {
    const gates = new Map<string, () => void>();
    const gate = async (root: string): Promise<void> => {
      const opened = new Promise<void>((resolve) => {
        gates.set(root, resolve);
      });

      return opened;
    };

    fakes.ensureLoaded.mockImplementation(gate);
    roots.apply('/one', loadedWith([PACKAGE_NODE_STUB]));

    const running = pickAndRun(roots, fakes.ports);

    expect(fakes.ensureLoaded.mock.calls).toStrictEqual([['/one'], ['/two']]);

    gates.get('/one')?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(fakes.pick).not.toHaveBeenCalled();

    gates.get('/two')?.();
    await running;

    expect(fakes.pick).toHaveBeenCalledOnce();
  });

  it('GIVEN no root has a model WHEN it starts THEN it says no tasks are available and picks nothing', async () => {
    await pickAndRun(roots, fakes.ports);

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NO_TASKS_TEXT);
    expect(fakes.pick).not.toHaveBeenCalled();
  });

  it('GIVEN a root whose only tasks are scripts no turbo config defines WHEN it starts THEN it lists no task', async () => {
    const script: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

    roots.apply('/one', loadedWith([{ ...PACKAGE_NODE_STUB, tasks: [script] }]));

    await pickAndRun(roots, fakes.ports);

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NO_TASKS_TEXT);
    expect(fakes.pick).not.toHaveBeenCalled();
  });

  it('GIVEN the only model sits in a root with a binary error WHEN it starts THEN it says no tasks are available', async () => {
    roots.apply('/one', loadedWith([PACKAGE_NODE_STUB]));
    roots.apply('/one', binaryFailure);

    await pickAndRun(roots, fakes.ports);

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NO_TASKS_TEXT);
  });

  describe('GIVEN a root holding package a with the build task', () => {
    beforeEach(() => {
      roots.apply('/one', loadedWith([PACKAGE_NODE_STUB]));
    });

    it('WHEN a task and then a package are picked THEN that root, package and task run', async () => {
      fakes.choose('build', 'a');

      await pickAndRun(roots, fakes.ports);

      expect(fakes.run).toHaveBeenCalledExactlyOnceWith(requestOf('/one', 'a', TASK_NODE_STUB));
    });

    it('WHEN the picked task turns into a script during the package pick THEN nothing runs', async () => {
      const script: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

      fakes.pick.mockImplementationOnce(async (items) => Promise.resolve(items[0]));
      fakes.pick.mockImplementationOnce(async (items) => {
        roots.apply('/one', loadedWith([{ ...PACKAGE_NODE_STUB, tasks: [script] }]));

        return Promise.resolve(items[0]);
      });

      await pickAndRun(roots, fakes.ports);

      expect(fakes.run).not.toHaveBeenCalled();
    });

    it('WHEN the task pick is closed THEN nothing more is asked or run', async () => {
      await pickAndRun(roots, fakes.ports);

      expect(fakes.pick).toHaveBeenCalledOnce();
      expect(fakes.run).not.toHaveBeenCalled();
    });

    it('WHEN the package pick is closed THEN nothing runs', async () => {
      fakes.choose('build');

      await pickAndRun(roots, fakes.ports);

      expect(fakes.run).not.toHaveBeenCalled();
    });

    it('WHEN the root reloads without the package before its pick THEN nothing more is asked or run', async () => {
      fakes.pick.mockImplementationOnce(async (items) => {
        roots.apply('/one', loadedWith([]));

        return Promise.resolve(items[0]);
      });

      await pickAndRun(roots, fakes.ports);

      expect(fakes.pick).toHaveBeenCalledOnce();
      expect(fakes.run).not.toHaveBeenCalled();
    });

    it('WHEN the root reloads without the task during the package pick THEN nothing runs', async () => {
      fakes.pick.mockImplementationOnce(async (items) => Promise.resolve(items[0]));
      fakes.pick.mockImplementationOnce(async (items) => {
        roots.apply('/one', loadedWith([]));

        return Promise.resolve(items[0]);
      });

      await pickAndRun(roots, fakes.ports);

      expect(fakes.run).not.toHaveBeenCalled();
    });
  });

  it('GIVEN two roots hold the task name WHEN the second root is picked THEN the package pick lists that root only', async () => {
    roots.apply('/one', loadedWith([PACKAGE_NODE_STUB]));
    roots.apply('/two', loadedWith([{ ...PACKAGE_NODE_STUB, name: 'z' }]));
    fakes.pick.mockImplementationOnce(async (items) => Promise.resolve(items.find((item) => item.root === '/two')));
    fakes.choose('z');

    await pickAndRun(roots, fakes.ports);

    expect(fakes.pick.mock.calls[1]?.[0].map((item) => item.value)).toStrictEqual(['z']);
    expect(fakes.run).toHaveBeenCalledExactlyOnceWith(requestOf('/two', 'z', TASK_NODE_STUB));
  });
});
