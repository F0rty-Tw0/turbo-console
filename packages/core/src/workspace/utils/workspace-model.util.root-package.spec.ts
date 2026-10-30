import { describe, expect, it } from 'vitest';

import { buildWorkspaceModel } from './workspace-model.util.ts';
import type { GraphPackage } from '../../shared/turbo/common/turbo.type.ts';
import type { TurboConfigFile } from '../common/turbo-config.type.ts';
import type { ModelSource, WorkspaceModel } from '../common/workspace-model.type.ts';
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

const PKG_A = graphPackage('a', 'packages/a', [], [graphTask('a#build', COMMAND, [], ['//#fmt', '//#lint'])]);

const PKG_B = graphPackage('b', 'packages/b', [], [graphTask('b#build', COMMAND, [], [])]);

const build = (root: GraphPackage | null, configs: TurboConfigFile[]): WorkspaceModel => {
  const graph = packageGraph([PKG_A, PKG_B], [], root);

  return buildWorkspaceModel(graph, configs, MODEL_SOURCE_STUB);
};

describe('FEATURE: workspace model root package', () => {
  describe('GIVEN a monorepo whose root keys //#fmt and a bare lint', () => {
    const model = build(ROOT, [ROOT_CONFIG]);

    it('WHEN built THEN rootPackage holds only //#fmt', () => {
      expect(model.rootPackage?.tasks.map((task) => task.id)).toStrictEqual(['//#fmt']);
    });

    it('WHEN built THEN rootPackage is the unlabelled // package with the root tags', () => {
      expect(model.rootPackage).toMatchObject({ name: '//', label: null, tags: ['root-tag'] });
    });

    it('WHEN built THEN //#fmt is a turbo task', () => {
      expect(model.rootPackage?.tasks[0]?.isTurboTask).toBe(true);
    });

    it('WHEN built THEN //#fmt keeps only the visible dependencies, sorted', () => {
      expect(model.rootPackage?.tasks[0]?.dependencies).toStrictEqual(['a#build', 'b#build']);
    });

    it('WHEN a package task depends on //#fmt and //#lint THEN only the //#fmt edge is kept', () => {
      expect(taskOf(model, 'a#build')?.dependencies).toStrictEqual(['//#fmt']);
    });

    it('WHEN built THEN model.packages does not list //', () => {
      expect(model.packages.map((pkg) => pkg.name)).toStrictEqual(['a', 'b']);
    });
  });

  describe('GIVEN a monorepo whose root config cannot be read', () => {
    it('WHEN built THEN rootPackage.tasks is empty', () => {
      const model = build(ROOT, []);

      expect(model.rootPackage?.tasks).toStrictEqual([]);
    });
  });

  describe('GIVEN a monorepo whose graph has no root', () => {
    it('WHEN built THEN rootPackage is null', () => {
      const model = build(null, [ROOT_CONFIG]);

      expect(model.rootPackage).toBeNull();
    });
  });

  describe('GIVEN a single-package source whose // package is the only node', () => {
    const graph = packageGraph([ROOT], [], ROOT);
    const model = buildWorkspaceModel(graph, [configOf({ lint: 'defined' })], SINGLE_SOURCE);

    it('WHEN built THEN rootPackage is null', () => {
      expect(model.rootPackage).toBeNull();
    });

    it('WHEN built THEN // is packages[0]', () => {
      expect(model.packages[0]?.name).toBe('//');
    });
  });
});
