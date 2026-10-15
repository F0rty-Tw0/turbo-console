import { describe, expect, it } from 'vitest';

import { commandOf } from './details-command.util.ts';
import type { PanelKey } from '../common/details.type.ts';

const KEY: PanelKey = { root: '/ws', packageName: 'a' };

describe('FEATURE: details panel commands', () => {
  describe('GIVEN a task message', () => {
    it.each([
      ['run', 'turboConsole.runTask'],
      ['stop', 'turboConsole.stopTask'],
      ['copy', 'turboConsole.copyCommand']
    ] as const)('WHEN %s is mapped THEN it runs %s on the panel task row', (type, command) => {
      const arg = { kind: 'task', root: '/ws', key: 'a#build', packageName: 'a' };

      expect(commandOf({ type, taskId: 'a#build' }, KEY)).toStrictEqual({ command, arg });
    });
  });

  it('GIVEN openPackageJson WHEN mapped THEN it opens the manifest of the panel package row', () => {
    const arg = { kind: 'pkg', root: '/ws', packageName: 'a' };

    expect(commandOf({ type: 'openPackageJson' }, KEY)).toStrictEqual({ command: 'turboConsole.openPackageJson', arg });
  });

  it('GIVEN showOutput WHEN mapped THEN it shows the output with no argument', () => {
    expect(commandOf({ type: 'showOutput' }, KEY)).toStrictEqual({ command: 'turboConsole.showOutput', arg: undefined });
  });
});
