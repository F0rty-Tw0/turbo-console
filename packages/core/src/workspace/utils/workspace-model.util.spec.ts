import { describe, expect, it } from 'vitest';

import { buildWorkspaceModel } from './workspace-model.util.ts';
import type { GraphPackage, PackageGraph } from '../../shared/turbo/common/turbo.type.ts';
import type { TurboConfigError, TurboConfigFile, TurboConfigOk } from '../common/turbo-config.type.ts';
import type { PackageEdge, PackageNode, TaskNode, WorkspaceModel } from '../common/workspace-model.type.ts';
import { MODEL_SOURCE_STUB } from '../test/stubs/model-source.stub.ts';
import { configError, manyErrors } from '../test/utils/config-error.spec.util.ts';
import { graphEdge, graphPackage, graphTask, packageGraph } from '../test/utils/graph.spec.util.ts';

type GraphEdge = PackageGraph['data']['packageGraph']['edges']['items'][number];

type Order = <TItem>(items: TItem[]) => TItem[];

const COMMAND = 'node -e 0';

const PARSE_ERROR: TurboConfigError = { path: 'packages/a/turbo.jsonc', error: 'InvalidSymbol at 3' };

const B_BUILD = graphTask('b#build', COMMAND, [], []);

const PKG_B = graphPackage('b', 'packages/b', [], [B_BUILD]);

const DEFS = graphPackage('defs', 'tools/defs', ['atomizer:definitions'], [graphTask('defs#gen', COMMAND, [], [])]);

const build = (packages: GraphPackage[], edges: GraphEdge[], configs: TurboConfigFile[]): WorkspaceModel => {
  const graph = packageGraph(packages, edges);

  return buildWorkspaceModel(graph, configs, MODEL_SOURCE_STUB);
};

const taskOf = (model: WorkspaceModel, id: string): TaskNode | undefined => {
  const tasks = model.packages.flatMap((pkg) => pkg.tasks);

  return tasks.find((task) => task.id === id);
};

const edgeText = (edge: PackageEdge): string => `${edge.source}>${edge.target}:${edge.kind}`;

const keep: Order = (items) => items;

const reverse: Order = (items) => items.toReversed();

/** Every list the builder sorts, in the order `order` gives: packages, tasks, tags, dependencies, edges, configs. */
const orderedInput = (order: Order): WorkspaceModel => {
  const lint = graphTask('a#lint', COMMAND, order(['z', 'y']), []);
  const conflict = graphTask('a#e2e--x', COMMAND, order(['atomizer:q', 'atomizer:p']), []);
  const aBuild = graphTask('a#build', COMMAND, order(['b', 'a']), order(['b#build', 'a#lint', 'a#e2e--x']));
  const pkgA = graphPackage('a', 'packages/a', order(['t2', 't1']), order([aBuild, lint, conflict]));
  const edges = order([graphEdge('b', 'a', 'dependency'), graphEdge('a', 'b', 'dependency')]);
  const configs = order<TurboConfigFile>([PARSE_ERROR, configError('packages/b/turbo.json')]);

  return build(order([pkgA, PKG_B]), edges, configs);
};

describe('FEATURE: workspace model build', () => {
  describe('GIVEN one package with one described task', () => {
    it('WHEN built THEN the model holds the root, version, sorted tags and the description', () => {
      const lint = graphTask('a#lint', COMMAND, ['z', 'y'], []);
      const descriptions = { lint: 'Lints a' };
      const config: TurboConfigOk = {
        path: 'packages/a/turbo.json',
        descriptions,
        tasks: {},
        persistent: {},
        extends: [],
        affectedUsingTaskInputs: false
      };
      const task: TaskNode = {
        id: 'a#lint',
        name: 'lint',
        command: COMMAND,
        description: 'Lints a',
        tags: ['y', 'z'],
        dependencies: [],
        kind: 'task',
        atom: null,
        isTurboTask: true,
        persistent: false
      };
      const pkg: PackageNode = { name: 'a', path: 'packages/a', tags: ['m', 'n'], tasks: [task] };
      const expected: WorkspaceModel = {
        root: '/repo',
        turboVersion: '2.11.7',
        packageManager: MODEL_SOURCE_STUB.packageManager,
        affectedMode: 'package',
        packages: [pkg],
        edges: [],
        warnings: []
      };

      const model = build([graphPackage('a', 'packages/a', ['n', 'm'], [lint])], [], [config]);

      expect(model).toStrictEqual(expected);
    });
  });

  describe('GIVEN a#build depending on a carrier, a phantom, a definitions-package task and visible tasks', () => {
    it('WHEN built THEN its dependencies keep only the visible ids, sorted', () => {
      const carrier = graphTask('a#e2e-src--x', COMMAND, ['atomizer:carrier'], []);
      const phantom = graphTask('a#phantom', null, [], []);
      const lint = graphTask('a#lint', COMMAND, [], []);
      const deps = ['defs#gen', 'b#build', 'a#phantom', 'a#e2e-src--x', 'a#lint'];
      const aBuild = graphTask('a#build', COMMAND, [], deps);
      const pkgA = graphPackage('a', 'packages/a', [], [aBuild, carrier, phantom, lint]);

      const model = build([pkgA, PKG_B, DEFS], [], []);

      expect(taskOf(model, 'a#build')?.dependencies).toStrictEqual(['a#lint', 'b#build']);
    });
  });

  describe('GIVEN turbo package edges', () => {
    it('WHEN an edge points into a definitions package THEN it is dropped', () => {
      const model = build([PKG_B, DEFS], [graphEdge('b', 'defs', 'dependency')], []);

      expect(model.edges).toStrictEqual([]);
    });

    it('WHEN an edge starts at the root // THEN it is dropped', () => {
      const model = build([PKG_B], [graphEdge('//', 'b', 'dependency')], []);

      expect(model.edges).toStrictEqual([]);
    });

    it('WHEN both ends are visible THEN the edge is kept with its kind', () => {
      const pkgA = graphPackage('a', 'packages/a', [], []);
      const expected: PackageEdge = { source: 'a', target: 'b', kind: 'dev-dependency' };

      const model = build([pkgA, PKG_B], [graphEdge('a', 'b', 'dev-dependency')], []);

      expect(model.edges).toStrictEqual([expected]);
    });

    it('WHEN they arrive unsorted THEN they are ordered by source, then target, then kind', () => {
      const packages = [graphPackage('a', 'packages/a', [], []), PKG_B, graphPackage('c', 'packages/c', [], [])];
      const edges = [graphEdge('b', 'a', 'k'), graphEdge('a', 'c', 'k'), graphEdge('a', 'b', 'k2'), graphEdge('a', 'b', 'k1')];

      const model = build(packages, edges, []);

      expect(model.edges.map(edgeText)).toStrictEqual(['a>b:k1', 'a>b:k2', 'a>c:k', 'b>a:k']);
    });
  });

  describe('GIVEN packages whose name order and path order differ', () => {
    it('WHEN built THEN they are sorted by name', () => {
      const model = build([graphPackage('a', 'z/a', [], []), graphPackage('b', 'y/b', [], [])], [], []);

      expect(model.packages.map((pkg) => pkg.name)).toStrictEqual(['a', 'b']);
    });
  });

  describe('GIVEN a package config that failed to parse', () => {
    const pkgA = graphPackage('a', 'packages/a', [], [graphTask('a#build', COMMAND, [], [])]);

    it('WHEN built THEN the warning names the file and the error', () => {
      const model = build([pkgA], [], [PARSE_ERROR]);

      expect(model.warnings).toStrictEqual(['packages/a/turbo.jsonc: InvalidSymbol at 3']);
    });

    it('WHEN built THEN its tasks get no description from it', () => {
      const model = build([pkgA], [], [PARSE_ERROR]);

      expect(taskOf(model, 'a#build')?.description).toBeNull();
    });
  });

  describe('GIVEN a parsed config carrying a warning', () => {
    it('WHEN built THEN the warning is prefixed with the file path', () => {
      const warning = 'both turbo.json and turbo.jsonc found; read turbo.json';
      const config: TurboConfigOk = {
        path: 'turbo.json',
        descriptions: {},
        tasks: {},
        persistent: {},
        extends: [],
        affectedUsingTaskInputs: false,
        warning
      };

      const model = build([PKG_B], [], [config]);

      expect(model.warnings).toStrictEqual([`turbo.json: ${warning}`]);
    });
  });

  describe('GIVEN configs that set affectedUsingTaskInputs', () => {
    it.each(['turbo.json', 'turbo.jsonc'])('WHEN the root %s sets it THEN the mode is task', (path) => {
      const root: TurboConfigOk = { path, descriptions: {}, tasks: {}, persistent: {}, extends: [], affectedUsingTaskInputs: true };

      const model = build([PKG_B], [], [root]);

      expect(model.affectedMode).toBe('task');
    });

    it('WHEN only a package config sets it THEN the mode is package', () => {
      const config: TurboConfigOk = {
        path: 'packages/b/turbo.json',
        descriptions: {},
        tasks: {},
        persistent: {},
        extends: [],
        affectedUsingTaskInputs: true
      };

      const model = build([PKG_B], [], [config]);

      expect(model.affectedMode).toBe('package');
    });
  });

  describe('GIVEN a package path with backslashes', () => {
    const e2e = graphPackage('@fx/e2e-1', 'apps\\e2e-1', [], [graphTask('@fx/e2e-1#test', COMMAND, [], [])]);
    const descriptions = { test: 'Runs e2e-1' };
    const config: TurboConfigOk = {
      path: 'apps/e2e-1/turbo.json',
      descriptions,
      tasks: {},
      persistent: {},
      extends: [],
      affectedUsingTaskInputs: false
    };

    it('WHEN built THEN the package path is posix', () => {
      const model = build([e2e], [], [config]);

      expect(model.packages[0]?.path).toBe('apps/e2e-1');
    });

    it('WHEN built THEN the package config at the posix path describes its task', () => {
      const model = build([e2e], [], [config]);

      expect(taskOf(model, '@fx/e2e-1#test')?.description).toBe('Runs e2e-1');
    });
  });

  describe('GIVEN a group tag holding a newline and U+202E', () => {
    it('WHEN built THEN the two-group warning holds neither', () => {
      const task = graphTask('a#t', COMMAND, ['atomizer:a', 'atomizer:b\nforged‮'], []);

      const model = build([graphPackage('a', 'packages/a', [], [task])], [], []);

      expect(model.warnings).toStrictEqual(['a#t: tagged with groups a, bforged; using a']);
    });
  });

  describe('GIVEN warnings whose order changes once they are made plain', () => {
    it('WHEN built THEN they are sorted by their plain text', () => {
      const configs = [configError('b/turbo.json'), configError('‮a/turbo.json')];

      const model = build([PKG_B], [], configs);

      expect(model.warnings).toStrictEqual(['a/turbo.json: InvalidSymbol at 3', 'b/turbo.json: InvalidSymbol at 3']);
    });
  });

  describe('GIVEN a warning longer than 1024 characters', () => {
    it('WHEN built THEN it is cut to its first 1024', () => {
      const model = build([PKG_B], [], [configError('x'.repeat(2000))]);

      expect(model.warnings).toStrictEqual(['x'.repeat(1024)]);
    });

    it('WHEN the cut falls inside a surrogate pair THEN the half pair becomes U+FFFD', () => {
      const model = build([PKG_B], [], [configError(`${'x'.repeat(1023)}😀`)]);

      expect(model.warnings).toStrictEqual([`${'x'.repeat(1023)}�`]);
    });
  });

  describe('GIVEN more warnings than the cap', () => {
    it('WHEN there are exactly 100 THEN all are kept with no overflow line', () => {
      const model = build([PKG_B], [], manyErrors(100));

      expect(model.warnings).toHaveLength(100);
      expect(model.warnings.at(-1)).toBe('packages/p099/turbo.json: InvalidSymbol at 3');
    });

    it('WHEN there are 102 THEN the first 100 in sort order are kept, then one overflow line', () => {
      const sortedErrors = manyErrors(100).toReversed();
      const expected = sortedErrors.map((config) => `${config.path}: ${config.error}`);

      const model = build([PKG_B], [], manyErrors(102));

      expect(model.warnings).toStrictEqual([...expected, 'warnings: 2 more not shown']);
    });
  });

  describe('GIVEN the same input with every list shuffled', () => {
    it('WHEN both are built THEN the models are deep-equal', () => {
      const first = orderedInput(keep);

      const shuffled = orderedInput(reverse);

      expect(shuffled).toStrictEqual(first);
    });
  });

  describe('GIVEN a parsed graph', () => {
    it('WHEN built THEN the graph itself is left unsorted', () => {
      const lint = graphTask('a#lint', COMMAND, ['z', 'y'], ['b#build', 'a#x']);
      const graph = packageGraph([PKG_B, graphPackage('a', 'packages/a', ['n', 'm'], [lint])], [graphEdge('b', 'a', 'k')]);
      const before = structuredClone(graph);

      buildWorkspaceModel(graph, [], MODEL_SOURCE_STUB);

      expect(graph).toStrictEqual(before);
    });
  });

  describe('GIVEN a package whose name holds a # and a package config describing build', () => {
    it('WHEN built THEN the task gets the description', () => {
      const descriptions = { build: 'Builds p#b' };
      const config: TurboConfigOk = {
        path: 'packages/pb/turbo.json',
        descriptions,
        tasks: {},
        persistent: {},
        extends: [],
        affectedUsingTaskInputs: false
      };
      const pkg = graphPackage('p#b', 'packages/pb', [], [graphTask('p#b#build', COMMAND, [], [])]);

      const model = build([pkg], [], [config]);

      expect(taskOf(model, 'p#b#build')?.description).toBe('Builds p#b');
    });
  });
});
