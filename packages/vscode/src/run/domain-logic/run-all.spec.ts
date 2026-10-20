import type { PackageNode, TaskNode } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { RunAllGuard, runAll } from './run-all.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import { NO_TASKS_TEXT } from '../common/picker.const.ts';
import type { RunAllLaunch, RunAllRequest } from '../common/run-all.type.ts';
import { ALREADY_RUNNING_TEXT } from '../common/run.const.ts';
import type { RunAllFakes } from '../test/common/run-all-fakes.type.ts';
import { runAllFakes } from '../test/utils/run-all-ports.spec.util.ts';
import { runAllKey } from '../utils/run-all-task.util.ts';

const ONE: RootFolder = { root: '/one', name: 'one' };
const TWO: RootFolder = { root: '/two', name: 'two' };

const EVERYWHERE: RunAllRequest = { affected: false };
const AFFECTED: RunAllRequest = { affected: true };

const FLAG_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'a#-x', name: '-x' };

const FLAG_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [FLAG_TASK] };

const launchOf = (root: string, affected: boolean, singlePackage = false): RunAllLaunch => {
  const launch: RunAllLaunch = { root, binaryPath: TURBO_BINARY_STUB.path, taskName: 'build', affected, singlePackage };

  return launch;
};

describe('FEATURE: run a task in all packages', () => {
  let roots: RootStore;
  let guard: RunAllGuard;
  let fakes: RunAllFakes;

  beforeEach(() => {
    roots = new RootStore();
    guard = new RunAllGuard();
    fakes = runAllFakes();
  });

  describe('GIVEN one root holding package a with the build task', () => {
    beforeEach(() => {
      roots.set([ONE], coordinatorMock);
      roots.apply('/one', loadedWith([PACKAGE_NODE_STUB]));
    });

    it('WHEN a task is picked THEN no root is asked, that root loads, and build runs with no filter', async () => {
      fakes.choose('build');

      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      expect(fakes.ensureLoaded).toHaveBeenCalledExactlyOnceWith('/one');
      expect(fakes.pick).toHaveBeenCalledOnce();
      expect(fakes.execute).toHaveBeenCalledExactlyOnceWith(launchOf('/one', false), ['--skip-infer', 'run', 'build']);
    });

    it('WHEN it runs the affected packages THEN the arguments end with --affected', async () => {
      fakes.choose('build');

      await runAll(roots, guard, fakes.ports, AFFECTED);

      expect(fakes.execute).toHaveBeenCalledExactlyOnceWith(launchOf('/one', true), ['--skip-infer', 'run', 'build', '--affected']);
    });

    it('WHEN the task pick is closed THEN nothing runs and the key is not kept', async () => {
      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      expect(fakes.execute).not.toHaveBeenCalled();
      expect(guard.tryAdd(runAllKey('/one', 'build', false))).toBe(true);
    });

    it('WHEN the same run is asked twice with no await between THEN the second says already running and starts nothing', async () => {
      fakes.choose('build', 'build');

      const first = runAll(roots, guard, fakes.ports, EVERYWHERE);
      const second = runAll(roots, guard, fakes.ports, EVERYWHERE);

      await Promise.all([first, second]);

      expect(fakes.execute).toHaveBeenCalledOnce();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(ALREADY_RUNNING_TEXT);
      expect(fakes.isActive).toHaveBeenCalledOnce();
      expect(fakes.log).not.toHaveBeenCalled();
    });

    it('WHEN the same task runs on all and on affected THEN both start', async () => {
      fakes.choose('build', 'build');

      await runAll(roots, guard, fakes.ports, EVERYWHERE);
      await runAll(roots, guard, fakes.ports, AFFECTED);

      expect(fakes.execute).toHaveBeenCalledTimes(2);
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN the task ends and it is asked again THEN it starts again', async () => {
      fakes.choose('build', 'build');

      await runAll(roots, guard, fakes.ports, EVERYWHERE);
      guard.releaseOn({ root: '/one', id: '*build', affected: false });
      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      expect(fakes.execute).toHaveBeenCalledTimes(2);
    });

    it('WHEN the launch rejects THEN the key is released, the error is logged and the failed to start notice shows', async () => {
      fakes.execute.mockRejectedValueOnce(new Error('no folder'));
      fakes.choose('build', 'build');

      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      expect(fakes.log).toHaveBeenCalledExactlyOnceWith('no folder');
      expect(fakes.notifyFailedToStart).toHaveBeenCalledOnce();

      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      expect(fakes.execute).toHaveBeenCalledTimes(2);
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN VS Code already runs that task THEN it says already running, logs it, and launches nothing', async () => {
      fakes.isActive.mockReturnValue(true);
      fakes.choose('build');

      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      expect(fakes.isActive).toHaveBeenCalledExactlyOnceWith(runAllKey('/one', 'build', false));
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(ALREADY_RUNNING_TEXT);
      expect(fakes.log).toHaveBeenCalledOnce();
      expect(fakes.execute).not.toHaveBeenCalled();
      expect(fakes.canExecute).not.toHaveBeenCalled();
      expect(guard.tryAdd(runAllKey('/one', 'build', false))).toBe(true);
    });

    it('WHEN the binary cannot run THEN nothing launches, the key is released and the notice shows', async () => {
      fakes.canExecute.mockResolvedValueOnce(false);
      fakes.choose('build');

      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      expect(fakes.execute).not.toHaveBeenCalled();
      expect(fakes.log).toHaveBeenCalledOnce();
      expect(fakes.notifyFailedToStart).toHaveBeenCalledOnce();
      expect(guard.tryAdd(runAllKey('/one', 'build', false))).toBe(true);
    });
  });

  it('GIVEN a task name turbo would read as a flag WHEN it is picked THEN nothing launches and the key is released', async () => {
    roots.set([ONE], coordinatorMock);
    roots.apply('/one', loadedWith([FLAG_PACKAGE]));
    fakes.choose('-x');

    await runAll(roots, guard, fakes.ports, EVERYWHERE);

    expect(fakes.execute).not.toHaveBeenCalled();
    expect(fakes.log).toHaveBeenCalledOnce();
    expect(fakes.notifyFailedToStart).toHaveBeenCalledOnce();
    expect(guard.tryAdd(runAllKey('/one', '-x', false))).toBe(true);
  });

  it('GIVEN one root with no model WHEN it starts THEN it says no tasks are available and picks nothing', async () => {
    roots.set([ONE], coordinatorMock);

    await runAll(roots, guard, fakes.ports, EVERYWHERE);

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NO_TASKS_TEXT);
    expect(fakes.pick).not.toHaveBeenCalled();
  });

  it('GIVEN a root that gets its model while it loads WHEN it starts THEN the tasks are read after the load and build runs', async () => {
    roots.set([ONE], coordinatorMock);
    fakes.ensureLoaded.mockImplementation(async (root) => {
      roots.apply(root, loadedWith([PACKAGE_NODE_STUB]));

      return Promise.resolve();
    });
    fakes.choose('build');

    await runAll(roots, guard, fakes.ports, EVERYWHERE);

    expect(fakes.execute).toHaveBeenCalledExactlyOnceWith(launchOf('/one', false), ['--skip-infer', 'run', 'build']);
  });

  it('GIVEN a root whose only tasks are scripts no turbo config defines WHEN it starts THEN it picks nothing', async () => {
    const script: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

    roots.set([ONE], coordinatorMock);
    roots.apply('/one', loadedWith([{ ...PACKAGE_NODE_STUB, tasks: [script] }]));

    await runAll(roots, guard, fakes.ports, EVERYWHERE);

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NO_TASKS_TEXT);
    expect(fakes.pick).not.toHaveBeenCalled();
  });

  it('GIVEN a root holding a turbo task and a safe script WHEN it starts THEN the pick lists the turbo task only', async () => {
    const script: TaskNode = { ...TASK_NODE_STUB, id: 'a#lint', name: 'lint', isTurboTask: false };

    roots.set([ONE], coordinatorMock);
    roots.apply('/one', loadedWith([{ ...PACKAGE_NODE_STUB, tasks: [TASK_NODE_STUB, script] }]));

    await runAll(roots, guard, fakes.ports, EVERYWHERE);

    expect(fakes.pick.mock.calls[0]?.[0].map((item) => item.value)).toStrictEqual(['build']);
  });

  it('GIVEN no root WHEN it starts THEN it says no tasks are available', async () => {
    await runAll(roots, guard, fakes.ports, EVERYWHERE);

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NO_TASKS_TEXT);
  });

  describe('GIVEN two roots, each holding a build task', () => {
    beforeEach(() => {
      roots.set([ONE, TWO], coordinatorMock);
      roots.apply('/one', loadedWith([PACKAGE_NODE_STUB]));
      roots.apply('/two', loadedWith([{ ...PACKAGE_NODE_STUB, name: 'z' }]));
    });

    it('WHEN the second root is picked THEN only it loads and its task runs', async () => {
      fakes.choose('/two', 'build');

      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      const rootChoices = fakes.pick.mock.calls[0]?.[0].map((item) => item.value);

      expect(rootChoices).toStrictEqual(['/one', '/two']);
      expect(fakes.ensureLoaded).toHaveBeenCalledExactlyOnceWith('/two');
      expect(fakes.execute).toHaveBeenCalledExactlyOnceWith(launchOf('/two', false), ['--skip-infer', 'run', 'build']);
    });

    it('WHEN the root pick is closed THEN nothing loads or runs', async () => {
      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      expect(fakes.ensureLoaded).not.toHaveBeenCalled();
      expect(fakes.execute).not.toHaveBeenCalled();
    });

    it('WHEN the same task runs in each root THEN both start, since the key holds the root', async () => {
      fakes.choose('/one', 'build', '/two', 'build');

      await runAll(roots, guard, fakes.ports, EVERYWHERE);
      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      expect(fakes.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN a single-package root', () => {
    beforeEach(() => {
      const loaded = loadedWith([PACKAGE_NODE_STUB]);
      const model = { ...loaded.model, singlePackage: true };

      roots.set([ONE], coordinatorMock);
      roots.apply('/one', { ...loaded, model });
    });

    it('WHEN run all picks build THEN the launch and the arguments carry --single-package', async () => {
      fakes.choose('build');

      await runAll(roots, guard, fakes.ports, EVERYWHERE);

      expect(fakes.execute).toHaveBeenCalledExactlyOnceWith(launchOf('/one', false, true), [
        '--skip-infer',
        'run',
        'build',
        '--single-package'
      ]);
    });

    it('WHEN run all affected picks build THEN --single-package follows --affected', async () => {
      fakes.choose('build');

      await runAll(roots, guard, fakes.ports, AFFECTED);

      expect(fakes.execute).toHaveBeenCalledExactlyOnceWith(launchOf('/one', true, true), [
        '--skip-infer',
        'run',
        'build',
        '--affected',
        '--single-package'
      ]);
    });
  });
});
