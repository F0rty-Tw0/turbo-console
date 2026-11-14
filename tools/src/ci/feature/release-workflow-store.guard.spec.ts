import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { cacheProblemsOf, installProblemsOf } from './test/utils/workflow-safety.spec.util.ts';

const ROOT = join(import.meta.dirname, '../../../../');

const INSTALL_SAFE = '        run: pnpm install --frozen-lockfile --ignore-scripts';
const INSTALL_BARE = '        run: pnpm install --frozen-lockfile';
const installJob = (name: string, install: string): string[] => {
  return [`  ${name}:`, '    steps:', '      - name: Install dependencies', install];
};
const installJobs = (marketplace: string, openvsx: string): string[] => {
  const first = installJob('publish-marketplace', marketplace);
  const second = installJob('publish-openvsx', openvsx);

  return ['jobs:', ...first, ...second];
};
const STORE_INSTALLS = installJobs(INSTALL_SAFE, INSTALL_SAFE);
const MARKETPLACE_BARE = installJobs(INSTALL_BARE, INSTALL_SAFE);
const OPENVSX_BARE = installJobs(INSTALL_SAFE, INSTALL_BARE);
const STORE_HEAD = [
  'jobs:',
  '  publish-openvsx:',
  '    environment: store',
  '    steps:',
  '      - uses: actions/setup-node@x',
  '        with:'
];
const storeSetup = (...setupLines: string[]): string[] => {
  return [...STORE_HEAD, ...setupLines];
};
const CACHE_OFF = '          package-manager-cache: false';
const CACHE_OK = storeSetup('          node-version-file: .nvmrc', CACHE_OFF);
const CACHE_PNPM = storeSetup('          cache: pnpm', CACHE_OFF);
const CACHE_AUTO = storeSetup('          node-version-file: .nvmrc');
const ACTION_STEP = '      - uses: actions/cache@abc';
const WITH_CACHE_OFF = storeSetup(CACHE_OFF);
const CACHE_ACTION = [...WITH_CACHE_OFF, ACTION_STEP];
const PLAIN_JOB_CACHE = [
  'jobs:',
  '  package:',
  '    steps:',
  '      - uses: actions/setup-node@x',
  '        with:',
  '          cache: pnpm'
];

const joined = (lines: string[]): string => lines.join('\n');

const RELEASE = readFileSync(join(ROOT, '.github/workflows/release.yml'), 'utf8');

describe('FEATURE: Release workflow store job guard', () => {
  describe('GIVEN the publish jobs install', () => {
    it('WHEN the repo release.yml is read THEN both skip lifecycle scripts', () => {
      const result = installProblemsOf(RELEASE);

      expect(result).toStrictEqual([]);
    });

    it('WHEN both install with --ignore-scripts THEN no problem is listed', () => {
      const result = installProblemsOf(joined(STORE_INSTALLS));

      expect(result).toStrictEqual([]);
    });

    it('WHEN publish-marketplace drops --ignore-scripts THEN it is listed', () => {
      const result = installProblemsOf(joined(MARKETPLACE_BARE));

      expect(result).toStrictEqual(['publish-marketplace lacks the line: run: pnpm install --frozen-lockfile --ignore-scripts']);
    });

    it('WHEN publish-openvsx drops --ignore-scripts THEN it is listed', () => {
      const result = installProblemsOf(joined(OPENVSX_BARE));

      expect(result).toStrictEqual(['publish-openvsx lacks the line: run: pnpm install --frozen-lockfile --ignore-scripts']);
    });
  });

  describe('GIVEN a job with environment: store', () => {
    it('WHEN the repo release.yml is read THEN none restores a cache and each turns the setup-node cache off', () => {
      const result = cacheProblemsOf(RELEASE);

      expect(result).toStrictEqual([]);
    });

    it('WHEN setup-node turns the cache off THEN no problem is listed', () => {
      const result = cacheProblemsOf(joined(CACHE_OK));

      expect(result).toStrictEqual([]);
    });

    it('WHEN setup-node sets cache: pnpm THEN it is listed', () => {
      const result = cacheProblemsOf(joined(CACHE_PNPM));

      expect(result).toStrictEqual(['publish-openvsx restores a cache: cache: pnpm']);
    });

    it('WHEN the automatic package-manager cache is left on THEN it is listed', () => {
      const result = cacheProblemsOf(joined(CACHE_AUTO));

      expect(result).toStrictEqual(['publish-openvsx lacks the line: package-manager-cache: false']);
    });

    it('WHEN an actions/cache step is added THEN it is listed', () => {
      const result = cacheProblemsOf(joined(CACHE_ACTION));

      expect(result).toStrictEqual(['publish-openvsx restores a cache: - uses: actions/cache@abc']);
    });

    it('WHEN a job without the store environment caches THEN no problem is listed', () => {
      const result = cacheProblemsOf(joined(PLAIN_JOB_CACHE));

      expect(result).toStrictEqual([]);
    });
  });
});
