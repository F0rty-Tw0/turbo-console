import { describe, expect, it } from 'vitest';

import { atomPackages, planAtomGroups } from './plan-atom-groups.util.ts';
import { planPackages } from './plan-packages.util.ts';
import { createPrng } from './prng.util.ts';
import { PRESETS } from '../common/fixture.const.ts';
import type { AtomGroupPlan, FixtureSpec, ManifestPackage, PackagePlan, PresetName } from '../common/fixture.type.ts';
import { ATOM_GROUP_PLAN_STUB, FIXTURE_SPEC_STUB } from '../test/stubs/fixture.stub.ts';

type PlannedFixture = {
  readonly packages: PackagePlan[];
  readonly groups: AtomGroupPlan[];
};

const planFixture = (spec: FixtureSpec): PlannedFixture => {
  const random = createPrng(spec.seed);
  const packages = planPackages(spec, random);
  const groups = planAtomGroups(spec, packages, random);
  const planned: PlannedFixture = { packages, groups };

  return planned;
};

const PRESETS_WITH_ATOM_GROUPS: PresetName[] = ['target-like', 'stretch-300'];

describe('FEATURE: atom group planning', () => {
  describe('GIVEN the target-like preset with one group of ten files', () => {
    const spec = PRESETS['target-like'];

    describe('WHEN planned', () => {
      const { groups } = planFixture(spec);
      const specFiles = groups[0]?.specFiles ?? [];

      it('THEN one group names @fx/e2e-1 and @fx/e2e-1-atoms', () => {
        const names = groups.map((group) => [group.index, group.testPackage, group.definitionsPackage]);

        expect(names).toStrictEqual([[1, '@fx/e2e-1', '@fx/e2e-1-atoms']]);
      });

      it('THEN ten spec files are numbered 001 to 010 under tests/', () => {
        const numbers = specFiles.map((file) => /^tests\/spec-(\d{3})\.(?:live\.)?spec\.ts$/.exec(file.path)?.[1]);

        expect(numbers).toStrictEqual(['001', '002', '003', '004', '005', '006', '007', '008', '009', '010']);
      });

      it('THEN exactly one file is live and only live files carry the .live.spec.ts suffix', () => {
        const live = specFiles.filter((file) => file.live);
        const suffixed = specFiles.filter((file) => file.path.endsWith('.live.spec.ts'));

        expect(live).toHaveLength(1);
        expect(suffixed).toStrictEqual(live);
      });
    });

    it('WHEN planned twice with the same seed THEN the plans are equal', () => {
      const first = planFixture(spec);

      const second = planFixture(spec);

      expect(second).toStrictEqual(first);
    });
  });

  describe.each(PRESETS_WITH_ATOM_GROUPS)('GIVEN the %s preset with its atom groups', (presetName) => {
    describe('WHEN planned', () => {
      const spec = PRESETS[presetName];
      const { packages, groups } = planFixture(spec);
      const packageDependencies = packages.map((pkg) => pkg.dependencies);
      const testPackageDependencies = groups.map((group) => group.dependencies);
      const dependencyLists = [...packageDependencies, ...testPackageDependencies];
      const isDependedOn = (name: string): boolean => dependencyLists.some((dependencies) => dependencies.includes(name));
      const levelOf = new Map(packages.map((pkg) => [pkg.name, `${pkg.role}@${pkg.level}`]));

      it('THEN the hub still has exactly hubFanIn dependents', () => {
        const hubDependents = dependencyLists.filter((dependencies) => dependencies.includes('@fx/hub'));

        expect(hubDependents).toHaveLength(spec.hubFanIn);
      });

      it('THEN at least one top-level regular package has no dependents', () => {
        const topLevel = packages.filter((pkg) => pkg.role === 'regular' && pkg.level === spec.maxDepth - 1);
        const leaves = topLevel.filter((pkg) => !isDependedOn(pkg.name));

        expect(leaves.length).toBeGreaterThan(0);
      });

      it('THEN every test package depends on exactly one level-0 regular package', () => {
        const dependencyLevels = groups.map((group) => group.dependencies.map((name) => levelOf.get(name)));

        expect(dependencyLevels).toStrictEqual(groups.map(() => ['regular@0']));
      });
    });
  });

  describe('GIVEN two groups of 30 files at liveRatio 0.1', () => {
    it('WHEN planned THEN each group has exactly 3 live files despite 0.1 × 30 rounding above 3 in floats', () => {
      const atomGroups = { count: 2, filesPerGroup: 30, liveRatio: 0.1 };
      const spec: FixtureSpec = { ...FIXTURE_SPEC_STUB, atomGroups };

      const { groups } = planFixture(spec);

      expect(groups.map((group) => group.specFiles.filter((file) => file.live).length)).toStrictEqual([3, 3]);
    });
  });

  describe('GIVEN a spec with no atom groups', () => {
    it('WHEN planned THEN no group comes back', () => {
      const { groups } = planFixture(FIXTURE_SPEC_STUB);

      expect(groups).toStrictEqual([]);
    });
  });

  describe('GIVEN an atom group plan whose test package depends on @fx/pkg-001', () => {
    it('WHEN its packages are derived THEN the test package sits in apps/ with that dependency and the tagged definitions package in tools/ with none', () => {
      const test: ManifestPackage = {
        name: '@fx/e2e-1',
        path: 'apps/e2e-1',
        role: 'atom-test',
        tags: [],
        dependencies: ['@fx/pkg-001']
      };
      const definitions: ManifestPackage = {
        name: '@fx/e2e-1-atoms',
        path: 'tools/e2e-1-atoms',
        role: 'atom-definitions',
        tags: ['atomizer:definitions'],
        dependencies: []
      };

      const packages = atomPackages(ATOM_GROUP_PLAN_STUB);

      expect(packages).toStrictEqual([test, definitions]);
    });
  });
});
