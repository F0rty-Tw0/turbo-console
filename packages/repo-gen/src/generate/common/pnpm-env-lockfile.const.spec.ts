import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { FIXTURE_PACKAGE_MANAGER } from './fixture.const.ts';
import { PNPM_ENV_LOCKFILE } from './pnpm-env-lockfile.const.ts';

const ROOT_PACKAGE_JSON = new URL('../../../../../package.json', import.meta.url);

describe('FEATURE: fixture pnpm pin', () => {
  describe('GIVEN the workspace root package.json', () => {
    const rootManifest: unknown = JSON.parse(readFileSync(ROOT_PACKAGE_JSON, 'utf8'));

    it('WHEN compared with the fixture pin THEN fixtures use the same packageManager as this repo', () => {
      expect(rootManifest).toHaveProperty('packageManager', FIXTURE_PACKAGE_MANAGER);
    });
  });

  describe('GIVEN the rendered pnpm env lockfile document', () => {
    it('WHEN read THEN it pins the pnpm version of the fixture pin', () => {
      const version = FIXTURE_PACKAGE_MANAGER.replace('pnpm@', '');

      expect(PNPM_ENV_LOCKFILE).toContain(`\n        specifier: ${version}\n        version: ${version}\n`);
      expect(PNPM_ENV_LOCKFILE).toContain(`\n  pnpm@${version}:\n`);
    });
  });
});
