import { TurboException } from '@turbo-console/core';
import type { PackageNode, TaskNode, TurboErrorKind } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { pickForFileAndRun } from './pick-for-file.ts';
import type { LoadFailure, RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import { NOT_PACKAGE_TEXT, NO_TASKS_TEXT } from '../common/picker.const.ts';
import type { RunRequest } from '../common/run.type.ts';
import type { PickerFakes } from '../test/common/picker-fakes.type.ts';
import { pickerFakes } from '../test/utils/picker-ports.spec.util.ts';

const BIDI = String.fromCodePoint(0x202e);

const ONE: RootFolder = { root: '/one', name: 'one' };
const TWO: RootFolder = { root: '/two', name: 'two' };
const NOT_A_ROOT: RootFolder = { root: '/plain', name: 'plain' };

const LINT_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'lint', name: 'lint' };

const LINT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: 'b', path: 'packages/b', tasks: [LINT_TASK] };

const FILE = '/one/packages/a/package.json';

const requestOf = (root: string, packageName: string, task: TaskNode): RunRequest => {
  const request: RunRequest = { root, packageName, task, binaryPath: TURBO_BINARY_STUB.path };

  return request;
};

const failureOf = (stage: LoadFailure['stage'], kind: TurboErrorKind): LoadFailure => {
  const failure: LoadFailure = { kind: 'error', stage, error: new TurboException(kind, 'detail') };

  return failure;
};

describe('FEATURE: package.json run action', () => {
  let roots: RootStore;
  let fakes: PickerFakes;

  beforeEach(() => {
    roots = new RootStore();
    roots.set([ONE, TWO], coordinatorMock);
    fakes = pickerFakes([ONE, TWO, NOT_A_ROOT]);
    roots.apply('/one', loadedWith([PACKAGE_NODE_STUB, LINT_PACKAGE]));
  });

  it('GIVEN no file is open WHEN it runs THEN it says it is not a package', async () => {
    await pickForFileAndRun(roots, fakes.ports, null);

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
  });

  it('GIVEN a file in no workspace folder WHEN it runs THEN it says so and loads nothing', async () => {
    await pickForFileAndRun(roots, fakes.ports, '/elsewhere/packages/a/package.json');

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    expect(fakes.ensureLoaded).not.toHaveBeenCalled();
  });

  it('GIVEN a file in a workspace folder that is no turbo root WHEN it runs THEN it says so and loads nothing', async () => {
    await pickForFileAndRun(roots, fakes.ports, '/plain/packages/a/package.json');

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    expect(fakes.ensureLoaded).not.toHaveBeenCalled();
  });

  it('GIVEN the root manifest WHEN it runs THEN it loads the root and says it is not a package', async () => {
    await pickForFileAndRun(roots, fakes.ports, '/one/package.json');

    expect(fakes.ensureLoaded).toHaveBeenCalledExactlyOnceWith('/one');
    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
  });

  it('GIVEN a file that matches no package WHEN it runs THEN it says so and picks nothing', async () => {
    await pickForFileAndRun(roots, fakes.ports, '/one/packages/none/package.json');

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    expect(fakes.pick).not.toHaveBeenCalled();
  });

  it('GIVEN a root with no model and no error after the load WHEN it runs THEN it says it is not a package', async () => {
    await pickForFileAndRun(roots, fakes.ports, '/two/packages/a/package.json');

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
  });

  it('GIVEN a root whose load failed with no model WHEN it runs THEN it shows the load error text', async () => {
    roots.apply('/two', failureOf('load', 'failed'));

    await pickForFileAndRun(roots, fakes.ports, '/two/packages/a/package.json');

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(MESSAGE_TEXTS['load-no-model']);
  });

  it('GIVEN a root whose reload failed over a shown model WHEN it runs THEN the task pick still opens', async () => {
    roots.apply('/one', failureOf('load', 'failed'));

    await pickForFileAndRun(roots, fakes.ports, FILE);

    expect(fakes.pick).toHaveBeenCalledOnce();
  });

  it.each<[TurboErrorKind, string]>([
    ['not-found', MESSAGE_TEXTS['binary-not-found']],
    ['version-unsupported', MESSAGE_TEXTS['binary-version']],
    ['io', MESSAGE_TEXTS['binary-other']]
  ])('GIVEN a root in a %s binary error WHEN it runs THEN it shows that error text', async (kind, text) => {
    roots.apply('/one', failureOf('binary', kind));

    await pickForFileAndRun(roots, fakes.ports, FILE);

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(text);
  });

  it('GIVEN a package with no visible task WHEN it runs THEN it says no tasks are available', async () => {
    roots.apply('/one', loadedWith([{ ...PACKAGE_NODE_STUB, tasks: [] }]));

    await pickForFileAndRun(roots, fakes.ports, FILE);

    expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NO_TASKS_TEXT);
  });

  it('GIVEN a file whose path differs from the root in case WHEN a task is picked THEN that package and task run', async () => {
    fakes.choose('build');

    await pickForFileAndRun(roots, fakes.ports, '/ONE/packages/a/package.json');

    expect(fakes.run).toHaveBeenCalledExactlyOnceWith(requestOf('/one', 'a', TASK_NODE_STUB));
  });

  it('GIVEN a package WHEN a task is picked THEN that package and task run', async () => {
    fakes.choose('build');

    await pickForFileAndRun(roots, fakes.ports, FILE);

    expect(fakes.run).toHaveBeenCalledExactlyOnceWith(requestOf('/one', 'a', TASK_NODE_STUB));
  });

  it('GIVEN a package WHEN the pick opens THEN it offers that package\'s tasks only, named in the placeholder', async () => {
    await pickForFileAndRun(roots, fakes.ports, '/one/packages/b/package.json');

    const [items, placeholder] = fakes.pick.mock.calls[0] ?? [];

    expect(items?.map((item) => item.value)).toStrictEqual(['lint']);
    expect(placeholder).toBe('Select a task to run in b');
  });

  it('GIVEN a package name with a bidi mark WHEN the pick opens THEN the placeholder shows it cleaned', async () => {
    roots.apply('/one', loadedWith([{ ...LINT_PACKAGE, name: `${BIDI}b` }]));

    await pickForFileAndRun(roots, fakes.ports, '/one/packages/b/package.json');

    expect(fakes.pick.mock.calls[0]?.[1]).toBe('Select a task to run in b');
  });

  it('GIVEN the pick is closed WHEN it runs THEN nothing runs', async () => {
    await pickForFileAndRun(roots, fakes.ports, FILE);

    expect(fakes.run).not.toHaveBeenCalled();
  });

  it('GIVEN the root reloads without the task during the pick WHEN it ends THEN nothing runs', async () => {
    fakes.pick.mockImplementationOnce(async (items) => {
      roots.apply('/one', loadedWith([]));

      return Promise.resolve(items[0]);
    });

    await pickForFileAndRun(roots, fakes.ports, FILE);

    expect(fakes.run).not.toHaveBeenCalled();
  });
});
