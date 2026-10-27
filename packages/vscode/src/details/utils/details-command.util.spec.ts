import { describe, expect, it } from 'vitest';

import { commandOf } from './details-command.util.ts';
import type { RunDefinition, TaskTarget } from '../../run/common/run.type.ts';
import { taskTargetOf } from '../../run/utils/run-target.util.ts';
import type { PackageTarget } from '../../tree/common/package-action.type.ts';
import { packageTargetOf } from '../../tree/utils/package-target.util.ts';
import type { PanelKey } from '../common/details.type.ts';

const KEY: PanelKey = { root: '/ws', packageName: 'a' };
const BUILD_DEFINITION: RunDefinition = { root: '/ws', id: 'a#build' };
const BUILD_TARGET: TaskTarget = { definition: BUILD_DEFINITION, packageName: 'a' };
const PACKAGE_TARGET: PackageTarget = { root: '/ws', packageName: 'a' };

describe('FEATURE: details panel commands', () => {
  describe('GIVEN a task message', () => {
    it.each([
      ['run', 'turboConsole.runTask'],
      ['stop', 'turboConsole.stopTask'],
      ['copy', 'turboConsole.copyCommand'],
      ['showInTaskGraph', 'turboConsole.showTaskGraph']
    ] as const)('WHEN %s is mapped THEN it runs %s on the panel task row', (type, command) => {
      const arg = { kind: 'task', root: '/ws', key: 'a#build', packageName: 'a' };

      expect(commandOf({ type, taskId: 'a#build' }, KEY)).toStrictEqual({ command, arg });
    });

    it.each(['run', 'stop', 'copy', 'showInTaskGraph'] as const)(
      'WHEN %s is mapped THEN the run commands read the panel task from its argument',
      (type) => {
        const { arg } = commandOf({ type, taskId: 'a#build' }, KEY);

        const target = taskTargetOf(arg);

        expect(target).toStrictEqual(BUILD_TARGET);
      }
    );
  });

  describe('GIVEN openPackageJson', () => {
    it('WHEN mapped THEN it opens the manifest of the panel package row', () => {
      const arg = { kind: 'pkg', root: '/ws', packageName: 'a' };

      expect(commandOf({ type: 'openPackageJson' }, KEY)).toStrictEqual({ command: 'turboConsole.openPackageJson', arg });
    });

    it('WHEN mapped THEN the package action reads the panel package from its argument', () => {
      const { arg } = commandOf({ type: 'openPackageJson' }, KEY);

      const target = packageTargetOf(arg);

      expect(target).toStrictEqual(PACKAGE_TARGET);
    });
  });

  describe('GIVEN focusInGraph', () => {
    it('WHEN mapped THEN it focuses the panel package row on the graph', () => {
      const arg = { kind: 'pkg', root: '/ws', packageName: 'a' };

      expect(commandOf({ type: 'focusInGraph' }, KEY)).toStrictEqual({ command: 'turboConsole.focusPackageInGraph', arg });
    });

    it('WHEN mapped THEN the package action reads the panel package from its argument', () => {
      const { arg } = commandOf({ type: 'focusInGraph' }, KEY);

      const target = packageTargetOf(arg);

      expect(target).toStrictEqual(PACKAGE_TARGET);
    });
  });

  it('GIVEN showOutput WHEN mapped THEN it shows the output with no argument', () => {
    expect(commandOf({ type: 'showOutput' }, KEY)).toStrictEqual({ command: 'turboConsole.showOutput', arg: undefined });
  });
});
