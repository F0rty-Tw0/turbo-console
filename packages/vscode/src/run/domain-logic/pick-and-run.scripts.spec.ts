import { join } from 'node:path';

import type { PackageNode, TaskNode } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { pickAndRun } from './pick-and-run.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import { NO_TASKS_TEXT } from '../common/picker.const.ts';
import type { RunRequest } from '../common/run.type.ts';
import type { PickerFakes } from '../test/common/picker-fakes.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { pickerFakes } from '../test/utils/picker-ports.spec.util.ts';

const ONE: RootFolder = { root: '/one', name: 'one' };

const turboLint: TaskNode = { ...TASK_NODE_STUB, id: 'a#lint', name: 'lint' };

const scriptLint: TaskNode = { ...TASK_NODE_STUB, id: 'b#lint', name: 'lint', isTurboTask: false };

const refusedScript: TaskNode = { ...TASK_NODE_STUB, id: 'b#a b', name: 'a b', isTurboTask: false };

const packageA: PackageNode = { ...PACKAGE_NODE_STUB, name: 'a', path: 'packages/a', tasks: [turboLint] };

const packageB: PackageNode = { ...PACKAGE_NODE_STUB, name: 'b', path: 'packages/b', tasks: [scriptLint, refusedScript] };

const requestOf = (pkg: PackageNode, task: TaskNode): RunRequest => {
  const packageDir = join('/one', pkg.path);
  const request: RunRequest = {
    ...RUN_REQUEST_STUB,
    root: '/one',
    packageName: pkg.name,
    packageDir,
    task,
    binaryPath: TURBO_BINARY_STUB.path
  };

  return request;
};

const valuesOfPick = (fakes: PickerFakes, call: number): string[] | undefined =>
  fakes.pick.mock.calls[call]?.[0].map((item) => item.value);

describe('FEATURE: palette run picker and scripts', () => {
  let roots: RootStore;
  let fakes: PickerFakes;

  beforeEach(() => {
    roots = new RootStore();
    roots.set([ONE], coordinatorMock);
    fakes = pickerFakes([ONE]);
    roots.apply('/one', loadedWith([packageA, packageB]));
  });

  describe('GIVEN lint is a turbo task in a and a script in b', () => {
    it('WHEN scripts are shown THEN lint lists once and offers both packages', async () => {
      fakes.scriptsShown.mockReturnValue(true);
      fakes.choose('lint');

      await pickAndRun(roots, fakes.ports);

      expect(valuesOfPick(fakes, 0)).toStrictEqual(['lint']);
      expect(valuesOfPick(fakes, 1)).toStrictEqual(['a', 'b']);
    });

    it('WHEN scripts are shown and b is picked THEN the script of b runs, not turbo', async () => {
      fakes.scriptsShown.mockReturnValue(true);
      fakes.choose('lint', 'b');

      await pickAndRun(roots, fakes.ports);

      expect(fakes.run).toHaveBeenCalledExactlyOnceWith(requestOf(packageB, scriptLint));
    });

    it('WHEN scripts are shown and a is picked THEN the turbo task of a runs', async () => {
      fakes.scriptsShown.mockReturnValue(true);
      fakes.choose('lint', 'a');

      await pickAndRun(roots, fakes.ports);

      expect(fakes.run).toHaveBeenCalledExactlyOnceWith(requestOf(packageA, turboLint));
    });

    it('WHEN scripts are hidden THEN only a is offered', async () => {
      fakes.choose('lint');

      await pickAndRun(roots, fakes.ports);

      expect(valuesOfPick(fakes, 1)).toStrictEqual(['a']);
    });
  });

  it('GIVEN a refused script name and scripts shown WHEN names are listed THEN the name is not offered', async () => {
    fakes.scriptsShown.mockReturnValue(true);

    await pickAndRun(roots, fakes.ports);

    expect(valuesOfPick(fakes, 0)).toStrictEqual(['lint']);
  });

  it('GIVEN only scripts and scripts hidden WHEN it starts THEN it says no tasks are available', async () => {
    roots.apply('/one', loadedWith([packageB]));

    await pickAndRun(roots, fakes.ports);

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NO_TASKS_TEXT);
  });

  it('GIVEN b is picked while scripts are shown WHEN scripts are hidden before the run THEN nothing runs', async () => {
    fakes.scriptsShown.mockReturnValue(true);
    fakes.pick.mockImplementationOnce(async (items) => Promise.resolve(items[0]));
    fakes.pick.mockImplementationOnce(async (items) => {
      fakes.scriptsShown.mockReturnValue(false);

      return Promise.resolve(items.find((item) => item.value === 'b'));
    });

    await pickAndRun(roots, fakes.ports);

    expect(fakes.run).not.toHaveBeenCalled();
  });
});
