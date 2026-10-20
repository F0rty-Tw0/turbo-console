import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { ModelViews } from './model-views.ts';
import type { ToolResolver } from '../../tool/common/tool.type.ts';
import { seededNext } from '../../tool/test/utils/seeded-next.spec.util.ts';
import { packageScriptsOf } from '../../tool/utils/package-scripts.util.ts';
import { resolveTool } from '../../tool/utils/tool-of.util.ts';
import { toolResolverMock } from '../test/mocks/tool-lookup.mock.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { modelViewOf } from '../utils/model-view.util.ts';

const NO_LIVE: ReadonlySet<string> = new Set();

const VITEST_COMMAND = 'vitest run';

const NO_TOOL_COMMAND = 'echo done';

const DELEGATING_COMMAND = 'npm run test:app';

const ROOT_NAME = '//';

const taskOf = (name: string, command: string): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `a#${name}`, name, command };

  return task;
};

const packageNamed = (name: string, bodies: Record<string, string>): PackageNode => {
  const tasks = Object.entries(bodies).map(([taskName, command]) => taskOf(taskName, command));
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, tasks };

  return pkg;
};

const pkgWith = (bodies: Record<string, string>): PackageNode => packageNamed('a', bodies);

const rootPkgWith = (bodies: Record<string, string>): PackageNode => packageNamed(ROOT_NAME, bodies);

const PKG = pkgWith({ test: DELEGATING_COMMAND, 'test:app': 'vitest' });

const PACKAGE_COUNT = 40;
const ROOT_EVERY = 5;
const QUERY_COUNT = 3000;
const SCRIPT_NAMES = ['t', 'test', 'build', 'lint'];
const TOOL_BODIES = ['vitest', 'jest', 'eslint .', 'echo done'];
const DELEGATION_STARTS = ['npm run', 'pnpm', 'turbo run', 'yarn run -s'];
const SEGMENT_STARTS = [...TOOL_BODIES, ...DELEGATION_STARTS];

type SeededQueries = {
  readonly views: ModelViews;
  readonly asks: [PackageNode, boolean, string][];
};

/** A body that ends at a tool, or runs another script (or turbo task) by name, so chains and `//` skips occur. */
const bodyOf = (next: (bound: number) => number): string => {
  const roll = next(2);
  const isTool = roll === 0;

  if (isTool) return TOOL_BODIES[next(TOOL_BODIES.length)] ?? '';

  return `${DELEGATION_STARTS[next(DELEGATION_STARTS.length)]} ${SCRIPT_NAMES[next(SCRIPT_NAMES.length)]}`;
};

const seededPackage = (next: (bound: number) => number, index: number): PackageNode => {
  const name = index % ROOT_EVERY === 0 ? ROOT_NAME : `p${index}`;
  const entries = SCRIPT_NAMES.filter(() => next(3) > 0).map((script): [string, string] => [script, bodyOf(next)]);
  const pkg = packageNamed(name, Object.fromEntries(entries));

  return pkg;
};

const seededCommandOf = (next: (bound: number) => number): string => {
  const segments = Array.from({ length: 1 + next(2) }, () => {
    const start = SEGMENT_STARTS[next(SEGMENT_STARTS.length)] ?? '';
    const isDelegation = DELEGATION_STARTS.includes(start);

    if (isDelegation) return `${start} ${SCRIPT_NAMES[next(SCRIPT_NAMES.length)]}`;

    return start;
  });

  return segments.join(' && ');
};

/** One package keeps one `singlePackage`, as production does: the per-package memo keeps the first one it sees. */
const seededQueriesOf = (seed: number): SeededQueries => {
  const next = seededNext(seed);
  const packages = Array.from({ length: PACKAGE_COUNT }, (_, index) => seededPackage(next, index));
  const slots = packages.map((pkg): [PackageNode, boolean] => {
    const roll = next(2);

    return [pkg, roll === 0];
  });
  const commands = Array.from({ length: 2 * SCRIPT_NAMES.length * SEGMENT_STARTS.length }, () => seededCommandOf(next));
  const askOf = (): [PackageNode, boolean, string] => {
    const [pkg, single] = slots[next(slots.length)] ?? [PKG, false];
    const command = commands[next(commands.length)] ?? '';
    const ask: [PackageNode, boolean, string] = [pkg, single, command];

    return ask;
  };
  const asks = Array.from({ length: QUERY_COUNT }, askOf);
  const queries: SeededQueries = { views: new ModelViews(resolveTool), asks };

  return queries;
};

describe('FEATURE: model views per model', () => {
  describe('GIVEN a model', () => {
    let views: ModelViews;

    beforeEach(() => {
      views = new ModelViews(resolveTool);
    });

    it('WHEN its view is asked for THEN it is the view of that model', () => {
      const view = views.of(WORKSPACE_MODEL_STUB, false, NO_LIVE);

      expect(view).toStrictEqual(modelViewOf(WORKSPACE_MODEL_STUB, false, NO_LIVE));
    });

    it('WHEN its view is asked for twice THEN both answers are the same object', () => {
      const first = views.of(WORKSPACE_MODEL_STUB, false, NO_LIVE);
      const second = views.of(WORKSPACE_MODEL_STUB, false, NO_LIVE);

      expect(second).toBe(first);
    });

    it('WHEN another model object is asked for THEN it gets its own view', () => {
      const other: WorkspaceModel = { ...WORKSPACE_MODEL_STUB };
      const first = views.of(WORKSPACE_MODEL_STUB, false, NO_LIVE);
      const second = views.of(other, false, NO_LIVE);

      expect(second).not.toBe(first);
    });
  });

  describe('GIVEN a tool resolver', () => {
    let resolver: ToolResolver;
    let views: ModelViews;

    beforeEach(() => {
      resolver = toolResolverMock();
      views = new ModelViews(resolver);
    });

    it('WHEN a command that only the package scripts explain is asked for THEN its tool and via come from them', () => {
      const match = views.toolOf(PKG, false, DELEGATING_COMMAND);

      expect([match?.tool.id, match?.via]).toStrictEqual(['vitest', ['test:app']]);
    });

    it('WHEN a command with a tool and one without are each asked for twice in one package THEN the resolver runs once per command', () => {
      views.toolOf(PKG, false, DELEGATING_COMMAND);
      views.toolOf(PKG, false, NO_TOOL_COMMAND);
      views.toolOf(PKG, false, DELEGATING_COMMAND);
      views.toolOf(PKG, false, NO_TOOL_COMMAND);

      expect(resolver).toHaveBeenCalledTimes(2);
    });

    it('WHEN a command that reads no scripts is asked for in three package objects THEN the resolver runs once', () => {
      views.toolOf(PKG, false, VITEST_COMMAND);
      views.toolOf(pkgWith({}), false, VITEST_COMMAND);
      views.toolOf(rootPkgWith({ t: 'jest' }), true, VITEST_COMMAND);

      expect(resolver).toHaveBeenCalledTimes(1);
    });

    it('WHEN a command that reads scripts is asked for in two package objects THEN the resolver runs once for each', () => {
      views.toolOf(pkgWith({ t: 'vitest' }), false, 'npm run t');
      views.toolOf(pkgWith({ t: 'vitest' }), false, 'npm run t');

      expect(resolver).toHaveBeenCalledTimes(2);
    });

    it('GIVEN a package whose commands read no scripts WHEN their tools are asked for THEN its tasks are never read', () => {
      let reads = 0;
      const counted: PackageNode = {
        ...PKG,
        get tasks(): TaskNode[] {
          reads += 1;

          return PKG.tasks;
        }
      };

      views.toolOf(counted, false, VITEST_COMMAND);
      views.toolOf(counted, false, NO_TOOL_COMMAND);

      expect(reads).toBe(0);
    });

    it('GIVEN test:app edited from vitest to jest (a new package object) WHEN test is asked for THEN it is Jest', () => {
      const before = views.toolOf(pkgWith({ test: DELEGATING_COMMAND, 'test:app': 'vitest' }), false, DELEGATING_COMMAND);
      const after = views.toolOf(pkgWith({ test: DELEGATING_COMMAND, 'test:app': 'jest' }), false, DELEGATING_COMMAND);

      expect([before?.tool.id, after?.tool.id]).toStrictEqual(['vitest', 'jest']);
    });

    it('GIVEN two roots whose // packages differ in t WHEN npm run t is asked for in each THEN each reads its own scripts', () => {
      const first = views.toolOf(rootPkgWith({ t: 'vitest' }), true, 'npm run t');
      const second = views.toolOf(rootPkgWith({ t: 'jest' }), true, 'npm run t');

      expect([first?.tool.id, second?.tool.id]).toStrictEqual(['vitest', 'jest']);
    });

    it('GIVEN two packages with different t bodies WHEN npm run t is asked for in each THEN each row has its own tool', () => {
      const first = views.toolOf(pkgWith({ t: 'vitest' }), false, 'npm run t');
      const second = views.toolOf(pkgWith({ t: 'eslint .' }), false, 'npm run t');

      expect([first?.tool.id, second?.tool.id]).toStrictEqual(['vitest', 'eslint']);
    });

    it('GIVEN a monorepo // WHEN turbo run test is asked for THEN it does not follow the test script', () => {
      const match = views.toolOf(rootPkgWith({ test: 'vitest' }), false, 'turbo run test');

      expect(match).toBeNull();
    });

    it('GIVEN a monorepo // asked for turbo run test first WHEN another package is asked for it THEN it still follows its test script', () => {
      const root = views.toolOf(rootPkgWith({ test: 'vitest' }), false, 'turbo run test');
      const web = views.toolOf(pkgWith({ test: 'vitest' }), false, 'turbo run test');

      expect([root, web?.tool.id]).toStrictEqual([null, 'vitest']);
    });

    it('GIVEN a single-package // WHEN turbo run test is asked for THEN it follows the test script', () => {
      const match = views.toolOf(rootPkgWith({ test: 'vitest' }), true, 'turbo run test');

      expect([match?.tool.id, match?.via]).toStrictEqual(['vitest', ['test']]);
    });

    it('WHEN no command is asked for THEN there is no tool', () => {
      const match = views.toolOf(PKG, false, null);

      expect(match).toBeNull();
    });

    it('WHEN no command is asked for THEN the resolver never runs', () => {
      views.toolOf(PKG, false, null);

      expect(resolver).not.toHaveBeenCalled();
    });
  });

  describe(`GIVEN one instance asked ${QUERY_COUNT} interleaved questions over ${PACKAGE_COUNT} seeded packages, every ${ROOT_EVERY}th a //`, () => {
    it.each([1, 2, 3])('WHEN seed %i asks them THEN each answer equals a fresh resolve over that package', (seed) => {
      const { views, asks } = seededQueriesOf(seed);

      const answers = asks.map(([pkg, single, command]) => views.toolOf(pkg, single, command));
      const fresh = asks.map(([pkg, single, command]) => resolveTool(command, packageScriptsOf(pkg, single)));

      expect(answers).toStrictEqual(fresh);
      expect(fresh.filter((match) => match !== null).length).toBeGreaterThan(QUERY_COUNT / 2);
    });
  });
});
