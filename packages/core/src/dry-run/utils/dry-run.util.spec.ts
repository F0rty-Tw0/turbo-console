import { describe, expect, it } from 'vitest';

import { dryRunArgs, toDryRunStates } from './dry-run.util.ts';
import { dryRunSchema } from '../../shared/turbo/common/dry-run.schema.ts';
import type { DryRun } from '../../shared/turbo/common/turbo.type.ts';
import type { DryRunState, TaskDefinition } from '../common/dry-run-state.type.ts';
import { readDryRunFixture } from '../test/utils/dry-run-fixture.spec.util.ts';

type DryRunTask = DryRun['tasks'][number];

const HIT = { status: 'HIT' } as const;

const MISS = { status: 'MISS' } as const;

const NONEXISTENT = '<NONEXISTENT>';

const INVALID_ARGUMENT = { kind: 'invalid-argument' };

/** turbo's resolved definition, with a key `TaskDefinition` does not keep. */
const DEFINITION = {
  inputs: ['src/**'],
  outputs: ['dist/**'],
  dependsOn: ['^build'],
  cache: true,
  persistent: false,
  env: ['API_URL'],
  outputLogs: 'full'
};

const TASK_DEFINITION: TaskDefinition = {
  inputs: ['src/**'],
  outputs: ['dist/**'],
  dependsOn: ['^build'],
  cache: true,
  persistent: false,
  env: ['API_URL']
};

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
    dependents: [],
    resolvedTaskDefinition: DEFINITION
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
  { id: 'ui#build', hash: 'b2', cache: 'HIT', definition: TASK_DEFINITION },
  { id: 'web#build', hash: 'b1', cache: 'MISS', definition: TASK_DEFINITION },
  { id: 'web#lint', hash: null, cache: 'deferred', definition: TASK_DEFINITION }
];

const FILTER_SYNTAX_NAMES = ['!x', 'x...', '{dir}', '[ref]', 'a*'];

describe('FEATURE: dry-run argv', () => {
  describe('GIVEN tasks and no packages', () => {
    it('WHEN built THEN it runs the tasks dry with no filter', () => {
      const args = dryRunArgs({ tasks: ['build', 'lint'] });

      expect(args).toStrictEqual(['run', 'build', 'lint', '--dry=json']);
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

  describe('GIVEN a pkg#task id', () => {
    it('WHEN built THEN it throws invalid-argument', () => {
      expect(() => dryRunArgs({ tasks: ['web#lint'] })).toThrow(expect.objectContaining(INVALID_ARGUMENT));
    });
  });

  describe('GIVEN a package name turbo would read as filter syntax', () => {
    it.each(FILTER_SYNTAX_NAMES)('WHEN %j is a package THEN it throws invalid-argument', (name) => {
      expect(() => dryRunArgs({ tasks: ['build'], packages: [name] })).toThrow(expect.objectContaining(INVALID_ARGUMENT));
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

  describe('GIVEN a task whose definition holds a key beyond the six', () => {
    it('WHEN converted THEN the state definition keeps the six keys only', () => {
      const states = toDryRunStates(dryRunOf([WEB_BUILD]));

      expect(states.map((state) => state.definition)).toStrictEqual([TASK_DEFINITION]);
    });
  });

  describe('GIVEN real turbo dry-run output of a lib workspace', () => {
    const json = dryRunSchema.parse(readDryRunFixture('dry-run-definition.json'));
    const definitionOf = (id: string): TaskDefinition | undefined => toDryRunStates(json).find((state) => state.id === id)?.definition;

    it('WHEN converted THEN a task with `inputs: []` keeps the empty list', () => {
      expect(definitionOf('lib#build')?.inputs).toStrictEqual([]);
    });

    it('WHEN converted THEN a persistent uncached task reads cache false and persistent true', () => {
      expect(definitionOf('lib#dev')).toMatchObject({ cache: false, persistent: true });
    });

    it('WHEN converted THEN the commandless check task is dropped', () => {
      expect(definitionOf('lib#check')).toBeUndefined();
    });
  });
});
