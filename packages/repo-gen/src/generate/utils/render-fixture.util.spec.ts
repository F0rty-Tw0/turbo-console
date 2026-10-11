import { describe, expect, it } from 'vitest';

import { planFixture, renderFixtureFiles } from './render-fixture.util.ts';
import { PRESETS } from '../common/fixture.const.ts';
import type { FixtureSpec } from '../common/fixture.type.ts';

const TARGET_LIKE = PRESETS['target-like'];

describe('FEATURE: whole-fixture planning and rendering', () => {
  describe('GIVEN the target-like preset', () => {
    it('WHEN planned twice THEN both plans are equal', () => {
      const first = planFixture(TARGET_LIKE);

      const second = planFixture(TARGET_LIKE);

      expect(second).toStrictEqual(first);
    });

    it('WHEN planned THEN it holds the regular packages and hub, and one atom group', () => {
      const plan = planFixture(TARGET_LIKE);

      expect([plan.packages.length, plan.atomGroups.length]).toStrictEqual([12, 1]);
    });

    describe('WHEN rendered', () => {
      const files = renderFixtureFiles(planFixture(TARGET_LIKE));
      const paths = files.map((file) => file.path);

      it('THEN every path is unique', () => {
        const unique = new Set(paths);

        expect(unique.size).toBe(paths.length);
      });

      it('THEN the root files come first, with one root turbo.json', () => {
        const rootTurbo = paths.filter((path) => path === 'turbo.json');

        expect(paths.slice(0, 5)).toStrictEqual(['package.json', 'pnpm-workspace.yaml', '.gitignore', 'turbo.json', 'pnpm-lock.yaml']);
        expect(rootTurbo).toHaveLength(1);
      });

      it('THEN every package and both atom packages get a package.json', () => {
        const manifests = paths.filter((path) => path.endsWith('/package.json'));

        expect(manifests).toHaveLength(14);
      });
    });
  });

  describe('GIVEN a spec with another seed', () => {
    it('WHEN planned THEN the plan differs', () => {
      const spec: FixtureSpec = { ...TARGET_LIKE, seed: 2 };

      const plan = planFixture(spec);

      expect(plan).not.toStrictEqual(planFixture(TARGET_LIKE));
    });
  });
});
