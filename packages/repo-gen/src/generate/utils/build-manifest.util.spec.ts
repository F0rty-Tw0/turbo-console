import { describe, expect, it } from 'vitest';

import { buildManifest } from './build-manifest.util.ts';
import { planAtomGroups } from './plan-atom-groups.util.ts';
import { planPackages } from './plan-packages.util.ts';
import { planTasks } from './plan-tasks.util.ts';
import { createPrng } from './prng.util.ts';
import { PRESETS } from '../common/fixture.const.ts';
import type { FixturePlan, ManifestAtom, ManifestTask, PackagePlan, TaskKind } from '../common/fixture.type.ts';
import { ATOM_GROUP_PLAN_STUB, FIXTURE_SPEC_STUB, PACKAGE_PLAN_STUB } from '../test/stubs/fixture.stub.ts';

const kindCounts = (tasks: ManifestTask[]): Partial<Record<TaskKind, number>> => {
  const counts: Partial<Record<TaskKind, number>> = {};

  for (const task of tasks) counts[task.kind] = (counts[task.kind] ?? 0) + 1;

  return counts;
};

describe('FEATURE: manifest building', () => {
  describe('GIVEN a stretch-300 plan with 20 atom groups of 200 files', () => {
    it('WHEN built THEN atom tasks are counted once under each of the two atom packages', () => {
      const spec = PRESETS['stretch-300'];
      const random = createPrng(spec.seed);
      const packages = planTasks(spec, planPackages(spec, random), random);
      const atomGroups = planAtomGroups(spec, packages, random);
      const plan: FixturePlan = { spec, packages, atomGroups };

      const manifest = buildManifest(plan, atomGroups);

      expect(manifest.packages).toHaveLength(300);
      expect(kindCounts(manifest.tasks)).toMatchObject({ 'atom-file': 8000, carrier: 8000, aggregate: 40, umbrella: 20 });
    });
  });

  describe('GIVEN the hub, one regular package with a phantom lint that depends on it, and one two-spec group, at six tasks', () => {
    const hub: PackagePlan = { ...PACKAGE_PLAN_STUB, name: '@fx/hub', path: 'packages/hub', role: 'hub', tags: ['fx:hub'] };
    const tasks = ['build', 'lint', 'test', 'typecheck', 'task-5', 'task-6'];
    const hubWithTasks: PackagePlan = { ...hub, tasks };
    const regular: PackagePlan = { ...PACKAGE_PLAN_STUB, level: 1, dependencies: ['@fx/hub'], tasks, phantoms: ['lint'] };
    const plan: FixturePlan = { spec: FIXTURE_SPEC_STUB, packages: [hubWithTasks, regular], atomGroups: [ATOM_GROUP_PLAN_STUB] };

    describe('WHEN built', () => {
      const manifest = buildManifest(plan, [ATOM_GROUP_PLAN_STUB]);
      const taskOf = (fullName: string): ManifestTask | undefined => manifest.tasks.find((task) => task.fullName === fullName);
      const rowOf = (task: ManifestTask): [string, TaskKind, boolean] => [task.taskName, task.kind, task.visible];
      const dependenciesOf = (fullName: string): string[] | undefined => taskOf(fullName)?.dependencies;
      const atomOf = (fullName: string): ManifestAtom | null | undefined => taskOf(fullName)?.atom;
      const tasksOf = (packageName: string): ManifestTask[] => manifest.tasks.filter((task) => task.packageName === packageName);

      it('THEN the packages are the planned ones, then the test and definitions packages', () => {
        const summary = manifest.packages.map((pkg) => [pkg.name, pkg.path, pkg.role, pkg.tags, pkg.dependencies]);

        expect(summary).toStrictEqual([
          ['@fx/hub', 'packages/hub', 'hub', ['fx:hub'], []],
          ['@fx/pkg-001', 'packages/pkg-001', 'regular', [], ['@fx/hub']],
          ['@fx/e2e-1', 'apps/e2e-1', 'atom-test', [], ['@fx/pkg-001']],
          ['@fx/e2e-1-atoms', 'tools/e2e-1-atoms', 'atom-definitions', ['atomizer:definitions'], []]
        ]);
      });

      it('THEN a phantom is kind phantom and invisible', () => {
        const lint: ManifestTask = {
          fullName: '@fx/pkg-001#lint',
          packageName: '@fx/pkg-001',
          taskName: 'lint',
          kind: 'phantom',
          dependencies: [],
          visible: false,
          atom: null
        };

        expect(taskOf('@fx/pkg-001#lint')).toStrictEqual(lint);
      });

      it('THEN ^build resolves to the build task of each package dependency', () => {
        expect(taskOf('@fx/pkg-001#build')).toMatchObject({ kind: 'task', dependencies: ['@fx/hub#build'], visible: true });
      });

      it('THEN task-<n> depends on the dependencies’ task-<n> and its own build, sorted', () => {
        expect(taskOf('@fx/pkg-001#task-5')?.dependencies).toStrictEqual(['@fx/hub#task-5', '@fx/pkg-001#build']);
      });

      it('THEN the test package runs the base tasks, and later root tasks are phantoms', () => {
        const testRootTasks = tasksOf('@fx/e2e-1').slice(0, 6);
        const kinds = testRootTasks.map((task) => [task.taskName, task.kind]);

        expect(kinds).toStrictEqual([
          ['build', 'task'],
          ['lint', 'task'],
          ['test', 'task'],
          ['typecheck', 'task'],
          ['task-5', 'phantom'],
          ['task-6', 'phantom']
        ]);
      });

      it('THEN every root task of the definitions package is an invisible phantom', () => {
        const definitionsRootTasks = tasksOf('@fx/e2e-1-atoms').slice(0, 6);
        const rows = definitionsRootTasks.map(rowOf);

        expect(rows).toStrictEqual(tasks.map((task) => [task, 'phantom', false]));
      });

      it('THEN the definitions package lists the file tasks, carriers and aggregate, all invisible, and no umbrella', () => {
        const definitionsAtomTasks = tasksOf('@fx/e2e-1-atoms').slice(6);
        const rows = definitionsAtomTasks.map(rowOf);

        expect(rows).toStrictEqual([
          ['e2e-ci--tests/spec-001.spec.ts', 'atom-file', false],
          ['e2e-ci--tests/spec-002.live.spec.ts', 'atom-file', false],
          ['e2e-ci-src--tests/spec-001.spec.ts', 'carrier', false],
          ['e2e-ci-src--tests/spec-002.live.spec.ts', 'carrier', false],
          ['e2e-ci--all', 'aggregate', false]
        ]);
      });

      it('THEN the test package lists the same atom tasks plus the umbrella, with only carriers invisible', () => {
        const testAtomTasks = tasksOf('@fx/e2e-1').slice(6);
        const rows = testAtomTasks.map(rowOf);

        expect(rows).toStrictEqual([
          ['e2e-ci--tests/spec-001.spec.ts', 'atom-file', true],
          ['e2e-ci--tests/spec-002.live.spec.ts', 'atom-file', true],
          ['e2e-ci-src--tests/spec-001.spec.ts', 'carrier', false],
          ['e2e-ci-src--tests/spec-002.live.spec.ts', 'carrier', false],
          ['e2e-ci--all', 'aggregate', true],
          ['e2e-ci', 'umbrella', true]
        ]);
      });

      it('THEN a file task depends on its own carrier and its app build, the aggregate on the file tasks, the umbrella on the aggregate', () => {
        const dependencies = [
          dependenciesOf('@fx/e2e-1#e2e-ci--tests/spec-001.spec.ts'),
          dependenciesOf('@fx/e2e-1-atoms#e2e-ci--tests/spec-001.spec.ts'),
          dependenciesOf('@fx/e2e-1#e2e-ci-src--tests/spec-001.spec.ts'),
          dependenciesOf('@fx/e2e-1-atoms#e2e-ci--all'),
          dependenciesOf('@fx/e2e-1#e2e-ci')
        ];

        expect(dependencies).toStrictEqual([
          ['@fx/e2e-1#e2e-ci-src--tests/spec-001.spec.ts', '@fx/pkg-001#build'],
          ['@fx/e2e-1-atoms#e2e-ci-src--tests/spec-001.spec.ts'],
          [],
          ['@fx/e2e-1-atoms#e2e-ci--tests/spec-001.spec.ts', '@fx/e2e-1-atoms#e2e-ci--tests/spec-002.live.spec.ts'],
          ['@fx/e2e-1#e2e-ci--all']
        ]);
      });

      it('THEN a file task carries its group and whether its spec file is live', () => {
        const atoms = [
          atomOf('@fx/e2e-1#e2e-ci--tests/spec-002.live.spec.ts'),
          atomOf('@fx/e2e-1#e2e-ci--tests/spec-001.spec.ts'),
          atomOf('@fx/e2e-1-atoms#e2e-ci--tests/spec-002.live.spec.ts')
        ];

        expect(atoms).toStrictEqual([
          { group: 'e2e-ci', isLive: true },
          { group: 'e2e-ci', isLive: false },
          { group: 'e2e-ci', isLive: true }
        ]);
      });

      it('THEN the aggregate and the umbrella carry the group and are never live', () => {
        const atoms = [atomOf('@fx/e2e-1#e2e-ci--all'), atomOf('@fx/e2e-1#e2e-ci'), atomOf('@fx/e2e-1-atoms#e2e-ci--all')];

        expect(atoms).toStrictEqual([
          { group: 'e2e-ci', isLive: false },
          { group: 'e2e-ci', isLive: false },
          { group: 'e2e-ci', isLive: false }
        ]);
      });

      it('THEN carriers and root tasks carry no atom', () => {
        const atoms = [
          atomOf('@fx/e2e-1#e2e-ci-src--tests/spec-002.live.spec.ts'),
          atomOf('@fx/e2e-1-atoms#e2e-ci-src--tests/spec-001.spec.ts'),
          atomOf('@fx/pkg-001#build')
        ];

        expect(atoms).toStrictEqual([null, null, null]);
      });
    });
  });
});
