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
    resolvedTaskDefinition: DEFINITION
  };

  return dryTask;
};

const WEB_BUILD = dryRunTask('web', 'build', 'b1', MISS);

const UI_BUILD = dryRunTask('ui', 'build', 'b2', HIT);

const WEB_LINT = dryRunTask('web', 'lint', null, MISS);

const WEB_TYPECHECK = dryRunTask('web', 'typecheck', 'b3', MISS);

const WEB_PHANTOM: DryRunTask = { ...WEB_TYPECHECK, command: NONEXISTENT };

const dryRunOf = (tasks: DryRunTask[], monorepo = true): DryRun => {
  const json: DryRun = { monorepo, tasks };

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

  describe('GIVEN singlePackage true', () => {
    it('WHEN built THEN --single-package follows the filters and --dry=json stays last', () => {
      const args = dryRunArgs({ tasks: ['build'], packages: ['//'], singlePackage: true });

      expect(args).toStrictEqual(['run', 'build', '--filter=//', '--single-package', '--dry=json']);
    });
  });

  describe('GIVEN singlePackage false or absent', () => {
    it('WHEN built THEN there is no --single-package', () => {
      const args = dryRunArgs({ tasks: ['build'], singlePackage: false });

      expect(args).toStrictEqual(['run', 'build', '--dry=json']);
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

    it('WHEN converted THEN a persistent uncached task keeps its own definition', () => {
      const devDefinition: TaskDefinition = { inputs: [], outputs: [], dependsOn: [], cache: false, persistent: true, env: [] };

      expect(definitionOf('lib#dev')).toStrictEqual(devDefinition);
    });

    it('WHEN converted THEN the commandless check task is dropped', () => {
      expect(definitionOf('lib#check')).toBeUndefined();
    });
  });
});

/** A single-package task: bare `taskId`, no `package`. */
const BARE_BUILD: DryRunTask = {
  taskId: 'build',
  task: 'build',
  hash: 'r1',
  command: 'node -e 0',
  cache: MISS,
  resolvedTaskDefinition: DEFINITION
};
const BARE_LINT: DryRunTask = { ...BARE_BUILD, taskId: 'lint', task: 'lint', hash: null };
const BARE_CHECK: DryRunTask = { ...BARE_BUILD, taskId: 'check', task: 'check', command: NONEXISTENT };

describe('GIVEN a single-package dry run (monorepo false, bare ids, no package)', () => {
  it('WHEN converted THEN ids read //#task, sorted, the null hash is deferred and the commandless task is dropped', () => {
    const states = toDryRunStates(dryRunOf([BARE_LINT, BARE_CHECK, BARE_BUILD], false));

    expect(states.map((state) => [state.id, state.cache])).toStrictEqual([
      ['//#build', 'MISS'],
      ['//#lint', 'deferred']
    ]);
  });
});

describe('GIVEN a single-package dry run whose tasks carry package: null (real output omits the key)', () => {
  it('WHEN converted THEN null reads like absent and the ids read //#task', () => {
    const nullPackage: DryRunTask = { ...BARE_BUILD, package: null };
    const states = toDryRunStates(dryRunOf([nullPackage], false));

    expect(states.map((state) => state.id)).toStrictEqual(['//#build']);
  });

  it('WHEN the schema parses the raw JSON THEN package: null is accepted', () => {
    const tasks = [{ ...BARE_BUILD, package: null }];
    const raw = { monorepo: false, tasks };

    expect(dryRunSchema.safeParse(raw).success).toBe(true);
  });
});

describe('GIVEN a monorepo dry run with a task that has no package', () => {
  it('WHEN converted THEN it throws invalid-output', () => {
    expect(() => toDryRunStates(dryRunOf([BARE_BUILD], true))).toThrow(expect.objectContaining({ kind: 'invalid-output' }));
  });

  it('WHEN the package is null THEN it throws invalid-output', () => {
    const nullPackage: DryRunTask = { ...BARE_BUILD, package: null };

    expect(() => toDryRunStates(dryRunOf([nullPackage], true))).toThrow(expect.objectContaining({ kind: 'invalid-output' }));
  });
});

describe('GIVEN a monorepo dry run whose task ids are qualified', () => {
  it('WHEN converted THEN the ids are not prefixed again', () => {
    expect(toDryRunStates(dryRunOf([WEB_BUILD])).map((state) => state.id)).toStrictEqual(['web#build']);
  });
});
