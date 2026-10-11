import { describe, expect, it } from 'vitest';

import { planPackages } from './plan-packages.util.ts';
import { planTasks, taskNamesFor } from './plan-tasks.util.ts';
import { createPrng } from './prng.util.ts';
import { PRESETS } from '../common/fixture.const.ts';
import type { FixtureSpec, PackagePlan } from '../common/fixture.type.ts';
import { FIXTURE_SPEC_STUB, PACKAGE_PLAN_STUB } from '../test/stubs/fixture.stub.ts';

describe('FEATURE: task planning', () => {
  describe('GIVEN the stub spec with ten packages and six tasks per package', () => {
    const packages = planPackages(FIXTURE_SPEC_STUB, createPrng(1));

    it('WHEN planned twice with the same seed THEN the plans are strictly equal', () => {
      const first = planTasks(FIXTURE_SPEC_STUB, packages, createPrng(5));

      const second = planTasks(FIXTURE_SPEC_STUB, packages, createPrng(5));

      expect(second).toStrictEqual(first);
    });

    describe('WHEN planned', () => {
      const planned = planTasks(FIXTURE_SPEC_STUB, packages, createPrng(5));
      const phantoms = planned.flatMap((pkg) => pkg.phantoms);

      it('THEN every package lists the four base tasks then task-5 and task-6', () => {
        expect(planned.every((pkg) => pkg.tasks.join() === 'build,lint,test,typecheck,task-5,task-6')).toBe(true);
      });

      it('THEN ceil(0.1 x 40 eligible pairs) = 4 phantoms are picked', () => {
        expect(phantoms).toHaveLength(4);
      });

      it('THEN build and test are never phantoms', () => {
        expect(phantoms.filter((task) => task === 'build' || task === 'test')).toStrictEqual([]);
      });

      it('THEN each package keeps its phantoms in task order', () => {
        expect(planned.every((pkg) => pkg.phantoms.join() === pkg.tasks.filter((task) => pkg.phantoms.includes(task)).join())).toBe(
          true
        );
      });

      it('THEN the input packages are left unchanged', () => {
        expect(packages.every((pkg) => pkg.tasks.length === 0)).toBe(true);
      });
    });
  });

  describe('GIVEN the target-like preset, whose 60 eligible pairs times 0.1 is 6.000000000000001 in floating point', () => {
    it('WHEN planned THEN exactly 6 phantoms are picked', () => {
      const spec = PRESETS['target-like'];
      const packages = planPackages(spec, createPrng(spec.seed));

      const planned = planTasks(spec, packages, createPrng(spec.seed));

      expect(planned.flatMap((pkg) => pkg.phantoms)).toHaveLength(6);
    });
  });

  describe('GIVEN a phantom ratio of 1', () => {
    it('WHEN planned THEN every task except build and test is a phantom in every package', () => {
      const spec: FixtureSpec = { ...FIXTURE_SPEC_STUB, phantomRatio: 1 };
      const packages = planPackages(spec, createPrng(1));

      const planned = planTasks(spec, packages, createPrng(1));

      expect(planned.every((pkg) => pkg.phantoms.join() === 'lint,typecheck,task-5,task-6')).toBe(true);
    });
  });

  describe('GIVEN a phantom ratio of 0', () => {
    it('WHEN planned THEN no phantoms are picked', () => {
      const spec: FixtureSpec = { ...FIXTURE_SPEC_STUB, phantomRatio: 0 };
      const packages = planPackages(spec, createPrng(1));

      const planned = planTasks(spec, packages, createPrng(1));

      expect(planned.flatMap((pkg) => pkg.phantoms)).toStrictEqual([]);
    });
  });

  describe('GIVEN an atom test package next to a regular one', () => {
    it('WHEN planned THEN the atom package passes through unchanged', () => {
      const atomTest: PackagePlan = { ...PACKAGE_PLAN_STUB, name: '@fx/e2e-1', path: 'apps/e2e-1', role: 'atom-test', tasks: [] };

      const planned = planTasks(FIXTURE_SPEC_STUB, [PACKAGE_PLAN_STUB, atomTest], createPrng(1));

      expect(planned[1]).toBe(atomTest);
    });
  });
});

describe('FEATURE: task names', () => {
  describe('GIVEN a task count', () => {
    it('WHEN it is 2 THEN the first two base tasks come back', () => {
      expect(taskNamesFor(2)).toStrictEqual(['build', 'lint']);
    });

    it('WHEN it is 4 THEN the four base tasks come back', () => {
      expect(taskNamesFor(4)).toStrictEqual(['build', 'lint', 'test', 'typecheck']);
    });

    it('WHEN it is 7 THEN task-5 to task-7 follow the base tasks', () => {
      expect(taskNamesFor(7)).toStrictEqual(['build', 'lint', 'test', 'typecheck', 'task-5', 'task-6', 'task-7']);
    });
  });
});
