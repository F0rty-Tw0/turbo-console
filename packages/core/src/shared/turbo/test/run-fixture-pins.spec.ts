import { FIXTURE_PACKAGE_MANAGER, PNPM_ENV_LOCKFILE } from '@turbo-console/repo-gen';
import type { FixtureFile } from '@turbo-console/repo-gen';
import { describe, expect, it } from 'vitest';

import { SINGLE_PACKAGE_FILES_STUB } from './stubs/single-package-files.stub.ts';
import { FORCE_FIXTURE_FILES_STUB } from '../../../run-summary/test/stubs/force-fixture.stub.ts';

const contentOf = (files: FixtureFile[], path: string): string => files.find((file) => file.path === path)?.content ?? '';

const RUN_FIXTURES: [string, FixtureFile[]][] = [
  ['the single-package fixture', SINGLE_PACKAGE_FILES_STUB],
  ['the force fixture', FORCE_FIXTURE_FILES_STUB]
];

describe('FEATURE: fixtures that a real turbo run executes in stay offline', () => {
  describe.each(RUN_FIXTURES)('GIVEN %s', (_, files) => {
    it("WHEN its root package.json is read THEN it pins this repo's pnpm", () => {
      const manifest: unknown = JSON.parse(contentOf(files, 'package.json'));

      expect(manifest).toHaveProperty('packageManager', FIXTURE_PACKAGE_MANAGER);
    });

    it("WHEN its pnpm-lock.yaml is read THEN it opens with pnpm's env lockfile, so pnpm never fetches itself", () => {
      expect(contentOf(files, 'pnpm-lock.yaml').startsWith(PNPM_ENV_LOCKFILE)).toBe(true);
    });
  });
});
