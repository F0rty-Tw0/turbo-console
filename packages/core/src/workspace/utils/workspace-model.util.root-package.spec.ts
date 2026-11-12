import { describe, expect, it } from 'vitest';

import { withRootGraphOf } from './single-package.util.ts';
import { buildWorkspaceModel, withWarning } from './workspace-model.util.ts';
import type { GraphPackage, PackageGraph } from '../../shared/turbo/common/turbo.type.ts';
import type { TurboConfigFile, TurboConfigOk } from '../common/turbo-config.type.ts';
import type { ModelSource, PackageNode, WorkspaceModel } from '../common/workspace-model.type.ts';
import { MODEL_SOURCE_STUB } from '../test/stubs/model-source.stub.ts';
import { configOf } from '../test/utils/config-ok.spec.util.ts';
import { graphPackage, graphTask, packageGraph } from '../test/utils/graph.spec.util.ts';
import { taskOf } from '../test/utils/model-task.spec.util.ts';

const COMMAND = 'node -e 0';

const SINGLE_SOURCE: ModelSource = { ...MODEL_SOURCE_STUB, singlePackage: true, rootLabel: 'single-app' };

/** The root keys `//#fmt` and the bare `lint`: turbo runs the root's `fmt` script, never its `lint` (rootKeyTaskOf). */
const ROOT_CONFIG = configOf({ '//#fmt': 'defined', lint: 'defined' });

const FMT = graphTask('//#fmt', COMMAND, [], ['b#build', 'a#build', '//#lint', 'x#gone']);

const LINT = graphTask('//#lint', COMMAND, [], []);

const ROOT = graphPackage('//', '', ['root-tag'], [FMT, LINT]);

const CONFLICT_ROOT = graphPackage('//', '', [], [graphTask('//#fmt', COMMAND, ['atomizer:a', 'atomizer:b'], [])]);

const PKG_A = graphPackage('a', 'packages/a', [], [graphTask('a#build', COMMAND, [], ['//#fmt', '//#lint'])]);

const PKG_B = graphPackage('b', 'packages/b', [], [graphTask('b#build', COMMAND, [], [])]);

const describedConfig = (descriptions: Record<string, string>): TurboConfigOk => {
  const config: TurboConfigOk = { ...ROOT_CONFIG, descriptions };

  return config;
};

const MONOREPO_SOURCE: ModelSource = { ...MODEL_SOURCE_STUB, rootLabel: 'root-fixture' };

/** The graph `loadWorkspace` builds a monorepo model from: `root`, when there is one, listed first among the nodes. */
const monorepoGraphOf = (root: GraphPackage | null): PackageGraph => withRootGraphOf(packageGraph([PKG_A, PKG_B], [], root));

const build = (root: GraphPackage | null, configs: TurboConfigFile[]): WorkspaceModel =>
  buildWorkspaceModel(monorepoGraphOf(root), configs, MONOREPO_SOURCE);

const rootOf = (model: WorkspaceModel): PackageNode | undefined => model.packages.find((pkg) => pkg.name === '//');

describe('FEATURE: workspace model root package', () => {
  describe('GIVEN a monorepo whose root keys //#fmt and a bare lint', () => {
    const model = build(ROOT, [ROOT_CONFIG]);

    it('WHEN built THEN model.packages lists // first, beside the other packages', () => {
      expect(model.packages.map((pkg) => pkg.name)).toStrictEqual(['//', 'a', 'b']);
    });

    it('WHEN built THEN // is the package at path "" with the root tags and the source label', () => {
      expect(rootOf(model)).toMatchObject({ path: '', label: 'root-fixture', tags: ['root-tag'] });
    });

    it('WHEN built THEN //#fmt is a turbo task', () => {
      expect(taskOf(model, '//#fmt')?.isTurboTask).toBe(true);
    });

    it('WHEN built THEN //#lint is a plain script: turbo runs only the //#fmt key for the root', () => {
      expect(taskOf(model, '//#lint')?.isTurboTask).toBe(false);
    });

    it('WHEN built THEN //#fmt keeps only the visible dependencies, sorted', () => {
      expect(taskOf(model, '//#fmt')?.dependencies).toStrictEqual(['//#lint', 'a#build', 'b#build']);
    });

    it('WHEN a package task depends on //#fmt and //#lint THEN both edges are kept', () => {
      expect(taskOf(model, 'a#build')?.dependencies).toStrictEqual(['//#fmt', '//#lint']);
    });
  });

  describe('GIVEN a monorepo whose root config describes the bare fmt and lint', () => {
    const bareDescriptions = { fmt: 'Bare fmt', lint: 'Bare lint' };
    const bare = describedConfig(bareDescriptions);

    it('WHEN //#fmt has no //#fmt description THEN it has none: turbo never applies a bare key to //', () => {
      const model = build(ROOT, [bare]);

      expect(taskOf(model, '//#fmt')?.description).toBeNull();
    });

    it('WHEN the config also describes //#fmt THEN that description is used', () => {
      const qualifiedDescriptions = { ...bareDescriptions, '//#fmt': 'Root fmt' };
      const qualified = describedConfig(qualifiedDescriptions);

      const model = build(ROOT, [qualified]);

      expect(taskOf(model, '//#fmt')?.description).toBe('Root fmt');
    });
  });

  describe('GIVEN a monorepo whose root config cannot be read', () => {
    it('WHEN built THEN every root script counts as a turbo task, as for any other package', () => {
      const model = build(ROOT, []);

      expect(rootOf(model)?.tasks.map((task) => task.isTurboTask)).toStrictEqual([true, true]);
    });
  });

  describe('GIVEN a monorepo whose root task is tagged with two groups', () => {
    const warning = '//#fmt: tagged with groups a, b; using a';

    it('WHEN built THEN the two-group warning is listed', () => {
      const model = build(CONFLICT_ROOT, [ROOT_CONFIG]);

      expect(model.warnings).toStrictEqual([warning]);
    });

    it('WHEN a warning is added after the build THEN the two-group warning is still listed once', () => {
      const graph = monorepoGraphOf(CONFLICT_ROOT);
      const model = buildWorkspaceModel(graph, [ROOT_CONFIG], MONOREPO_SOURCE);

      const warned = withWarning(model, graph, [ROOT_CONFIG], 'cache: x');

      expect(warned.warnings).toStrictEqual([warning, 'cache: x']);
    });
  });

  describe('GIVEN a monorepo whose graph has no root', () => {
    it('WHEN built THEN model.packages holds only the other packages', () => {
      const model = build(null, [ROOT_CONFIG]);

      expect(model.packages.map((pkg) => pkg.name)).toStrictEqual(['a', 'b']);
    });
  });

  describe('GIVEN a single-package source whose // package is the only node', () => {
    const graph = packageGraph([ROOT], [], ROOT);
    const model = buildWorkspaceModel(graph, [configOf({ lint: 'defined' })], SINGLE_SOURCE);

    it('WHEN built THEN // is packages[0]', () => {
      expect(model.packages[0]?.name).toBe('//');
    });
  });

  describe('GIVEN a single-package source whose // task is tagged with two groups', () => {
    it('WHEN a warning is added after the build THEN the two-group warning is listed once', () => {
      const graph = packageGraph([CONFLICT_ROOT], [], CONFLICT_ROOT);
      const model = buildWorkspaceModel(graph, [ROOT_CONFIG], SINGLE_SOURCE);

      const warned = withWarning(model, graph, [ROOT_CONFIG], 'cache: x');

      expect(warned.warnings).toStrictEqual(['//#fmt: tagged with groups a, b; using a', 'cache: x']);
    });
  });

  describe('GIVEN a single-package source whose config describes the bare lint', () => {
    const graph = packageGraph([ROOT], [], ROOT);
    const base = configOf({ lint: 'defined' });
    const descriptions = { lint: 'Bare lint' };
    const config: TurboConfigOk = { ...base, descriptions };
    const model = buildWorkspaceModel(graph, [config], SINGLE_SOURCE);

    it('WHEN built THEN //#lint takes the bare description', () => {
      expect(taskOf(model, '//#lint')?.description).toBe('Bare lint');
    });
  });
});
