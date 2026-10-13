import { describe, expect, it } from 'vitest';

import { dryRunArgs, toDryRunStates } from './dry-run.util.ts';
import type { DryRun } from '../../shared/turbo/common/turbo.type.ts';
import type { DryRunState } from '../common/dry-run-state.type.ts';

type DryRunTask = DryRun['tasks'][number];

const HIT = { status: 'HIT' } as const;

const MISS = { status: 'MISS' } as const;

const NONEXISTENT = '<NONEXISTENT>';

const INVALID_ARGUMENT = { kind: 'invalid-argument' };

const dryRunTask = (packageName: string, task: string, hash: string | null, cache: DryRunTask['cache']): DryRunTask => {
  const taskId = `${packageName}#${task}`;
  const dryTask: DryRunTask = {
    taskId,
    package: packageName,
    task,
    hash,
    command: 'node -e 0',
    cache,
    dependencies: [],
    dependents: []
  };

  return dryTask;
};

const WEB_BUILD = dryRunTask('web', 'build', 'b1', MISS);

const UI_BUILD = dryRunTask('ui', 'build', 'b2', HIT);

const WEB_LINT = dryRunTask('web', 'lint', null, MISS);

const WEB_TYPECHECK = dryRunTask('web', 'typecheck', 'b3', MISS);

const WEB_PHANTOM: DryRunTask = { ...WEB_TYPECHECK, command: NONEXISTENT };

const dryRunOf = (tasks: DryRunTask[]): DryRun => {
  const json: DryRun = { tasks };

  return json;
};

const SORTED_STATES: DryRunState[] = [
  { id: 'ui#build', hash: 'b2', cache: 'HIT' },
  { id: 'web#build', hash: 'b1', cache: 'MISS' },
  { id: 'web#lint', hash: null, cache: 'deferred' }
];

describe('FEATURE: dry-run argv', () => {
  describe('GIVEN tasks and no packages', () => {
    it('WHEN built THEN it runs the tasks dry with no filter', () => {
      const args = dryRunArgs({ tasks: ['build', 'web#lint'] });

      expect(args).toStrictEqual(['run', 'build', 'web#lint', '--dry=json']);
    });
  });

  describe('GIVEN tasks and packages', () => {
    it('WHEN built THEN each package is a --filter after the tasks', () => {
      const args = dryRunArgs({ tasks: ['build'], packages: ['web', '@scope/ui'] });

      expect(args).toStrictEqual(['run', 'build', '--filter=web', '--filter=@scope/ui', '--dry=json']);
    });
  });

  describe('GIVEN no task', () => {
    it('WHEN built THEN it throws invalid-argument', () => {
      expect(() => dryRunArgs({ tasks: [], packages: ['web'] })).toThrow(expect.objectContaining(INVALID_ARGUMENT));
    });
  });

  describe('GIVEN a task turbo would read as a flag', () => {
    it('WHEN built THEN it throws invalid-argument', () => {
      expect(() => dryRunArgs({ tasks: ['-x'] })).toThrow(expect.objectContaining(INVALID_ARGUMENT));
    });
  });

  describe('GIVEN a package turbo would read as a flag', () => {
    it('WHEN built THEN it throws invalid-argument', () => {
      expect(() => dryRunArgs({ tasks: ['build'], packages: ['--force'] })).toThrow(expect.objectContaining(INVALID_ARGUMENT));
    });
  });
});

describe('FEATURE: dry-run states', () => {
  describe('GIVEN turbo lists tasks out of id order, one JIT-hashed and one with no command', () => {
    it('WHEN converted THEN the commandless task is dropped, the null hash is deferred, and the rest is sorted by id', () => {
      const json = dryRunOf([WEB_PHANTOM, WEB_LINT, WEB_BUILD, UI_BUILD]);

      const states = toDryRunStates(json);

      expect(states).toStrictEqual(SORTED_STATES);
    });
  });

  describe('GIVEN turbo lists no task', () => {
    it('WHEN converted THEN there are no states', () => {
      const states = toDryRunStates(dryRunOf([]));

      expect(states).toStrictEqual([]);
    });
  });
});
