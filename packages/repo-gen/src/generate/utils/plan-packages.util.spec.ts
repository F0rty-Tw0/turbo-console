import { describe, expect, it } from 'vitest';

import { planPackages } from './plan-packages.util.ts';
import { createPrng } from './prng.util.ts';
import { PRESETS } from '../common/fixture.const.ts';
import type { FixtureSpec, PresetName } from '../common/fixture.type.ts';
import { FIXTURE_SPEC_STUB } from '../test/stubs/fixture.stub.ts';
import { dependentsOf, leafPackages, upwardEdges } from '../test/utils/package-graph.spec.util.ts';

const PRESET_NAMES: PresetName[] = ['target-like', 'stretch-300', 'stress'];

describe('FEATURE: package planning', () => {
  describe('GIVEN the stub spec with ten packages, depth 3 and hub fan-in 3', () => {
    it('WHEN planned twice with the same seed THEN the plans are strictly equal', () => {
      const first = planPackages(FIXTURE_SPEC_STUB, createPrng(FIXTURE_SPEC_STUB.seed));

      const second = planPackages(FIXTURE_SPEC_STUB, createPrng(FIXTURE_SPEC_STUB.seed));

      expect(second).toStrictEqual(first);
    });

    describe('WHEN planned', () => {
      const packages = planPackages(FIXTURE_SPEC_STUB, createPrng(FIXTURE_SPEC_STUB.seed));
      const hub = packages.find((pkg) => pkg.role === 'hub');

      it('THEN ten packages come back', () => {
        expect(packages).toHaveLength(10);
      });

      it('THEN no package depends on a package at its own or a higher level', () => {
        expect(upwardEdges(packages)).toStrictEqual([]);
      });

      it('THEN the hub is @fx/hub at packages/hub, level 0, tagged fx:hub', () => {
        expect(hub).toMatchObject({ name: '@fx/hub', path: 'packages/hub', level: 0, tags: ['fx:hub'] });
      });

      it('THEN the hub has exactly three dependents', () => {
        expect(dependentsOf(packages, '@fx/hub')).toHaveLength(3);
      });

      it('THEN at least one regular top-level package has no dependents', () => {
        expect(leafPackages(packages, 2).length).toBeGreaterThan(0);
      });

      it('THEN every level from 0 to maxDepth - 1 holds a regular package', () => {
        const regularLevels = packages.filter((pkg) => pkg.role === 'regular').map((pkg) => pkg.level);

        const levels = new Set(regularLevels);

        expect(levels).toStrictEqual(new Set([0, 1, 2]));
      });

      it('THEN regular packages are named @fx/pkg-<nnn> under packages/', () => {
        expect(packages[1]).toMatchObject({ name: '@fx/pkg-001', path: 'packages/pkg-001', role: 'regular', tags: [] });
      });

      it('THEN every package starts with no tasks and no phantoms', () => {
        expect(packages.every((pkg) => pkg.tasks.length === 0 && pkg.phantoms.length === 0)).toBe(true);
      });
    });
  });

  describe('GIVEN a spec with two atom groups', () => {
    it('WHEN planned THEN the atom packages are left out of the count', () => {
      const atomGroups = { ...FIXTURE_SPEC_STUB.atomGroups, count: 2 };
      const spec: FixtureSpec = { ...FIXTURE_SPEC_STUB, packages: 14, atomGroups };

      const packages = planPackages(spec, createPrng(spec.seed));

      expect(packages).toHaveLength(10);
    });
  });

  describe('GIVEN fewer regular packages than levels', () => {
    it('WHEN planned THEN it throws a RangeError', () => {
      const spec: FixtureSpec = { ...FIXTURE_SPEC_STUB, packages: 3, hubFanIn: 1 };

      const plan = (): unknown => planPackages(spec, createPrng(spec.seed));

      expect(plan).toThrow(RangeError);
    });
  });

  describe('GIVEN a hub fan-in larger than the packages above level 0', () => {
    it('WHEN planned THEN it throws a RangeError', () => {
      const spec: FixtureSpec = { ...FIXTURE_SPEC_STUB, hubFanIn: 9 };

      const plan = (): unknown => planPackages(spec, createPrng(spec.seed));

      expect(plan).toThrow(RangeError);
    });
  });

  describe('GIVEN each preset', () => {
    it.each(PRESET_NAMES)('WHEN %s is planned THEN the hub has hubFanIn dependents', (name) => {
      const spec = PRESETS[name];

      const packages = planPackages(spec, createPrng(spec.seed));

      expect(dependentsOf(packages, '@fx/hub')).toHaveLength(spec.hubFanIn);
    });
  });
});
