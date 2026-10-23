import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '../../../../');
const TAG = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)/g;
const DEV_BLOCK = /^ {2}dev:\n((?: {4}.*\n?)*)/m;
const DEV_PLAYWRIGHT = /^ {4}'@playwright\/test':\s*'(\d+\.\d+\.\d+)'/m;

const versionOf = (match: RegExpMatchArray): string => match[1] ?? '';

const containerVersionsOf = (ci: string): string[] => {
  const matches = ci.matchAll(TAG);

  return Array.from(matches, versionOf);
};

const devBlockOf = (workspace: string): string => DEV_BLOCK.exec(workspace)?.[1] ?? '';

/** Reads the `dev:` block of `catalogs:` only (four-space entries under the two-space `dev:` key). */
const devCatalogVersionOf = (workspace: string): string | null => {
  const block = devBlockOf(workspace);
  const entry = DEV_PLAYWRIGHT.exec(block);

  return entry?.[1] ?? null;
};

const PEER_FIRST_LINES = [
  'catalogs:',
  '  peer:',
  "    '@playwright/test': '>=1.56.0'",
  '  dev:',
  "    '@playwright/test': '1.64.0'",
  "    '@types/node': '24.19.2'",
  ''
];
const WORKSPACE_WITH_PEER_FIRST = PEER_FIRST_LINES.join('\n');

describe('FEATURE: Playwright image version guard', () => {
  describe('GIVEN a workflow with a Playwright container tag', () => {
    it('WHEN the versions are read THEN the tag version is listed', () => {
      const result = containerVersionsOf('container: mcr.microsoft.com/playwright:v1.64.0-noble');

      expect(result).toStrictEqual(['1.64.0']);
    });
  });

  describe('GIVEN a workflow with a Playwright container tag without a distro suffix', () => {
    it('WHEN the versions are read THEN the tag version is listed', () => {
      const result = containerVersionsOf('container: mcr.microsoft.com/playwright:v1.65.0');

      expect(result).toStrictEqual(['1.65.0']);
    });
  });

  describe('GIVEN a workflow without a Playwright container tag', () => {
    it('WHEN the versions are read THEN the list is empty', () => {
      const result = containerVersionsOf('runs-on: ubuntu-24.04');

      expect(result).toStrictEqual([]);
    });
  });

  describe('GIVEN a workspace with a peer range before the dev pin', () => {
    it('WHEN the dev catalog version is read THEN it is the dev pin, not the peer range', () => {
      const result = devCatalogVersionOf(WORKSPACE_WITH_PEER_FIRST);

      expect(result).toBe('1.64.0');
    });
  });

  describe('GIVEN a workspace whose dev catalog has no Playwright entry', () => {
    it('WHEN the dev catalog version is read THEN it is null', () => {
      const lines = ['catalogs:', '  dev:', "    '@types/node': '24.19.2'", ''];
      const workspace = lines.join('\n');

      const result = devCatalogVersionOf(workspace);

      expect(result).toBeNull();
    });
  });

  describe('GIVEN the repo ci.yml and pnpm-workspace.yaml', () => {
    it('WHEN the container tags are compared THEN every tag equals the dev catalog version', () => {
      const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');
      const workspace = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
      const versions = containerVersionsOf(ci);
      const pinned = devCatalogVersionOf(workspace);
      const mismatch = versions.find((version): boolean => version !== pinned);
      const message = `ci.yml container tag v${mismatch} does not match catalogs.dev['@playwright/test'] v${pinned}; bump both`;

      const failure = mismatch === undefined ? null : message;

      expect(versions.length).toBeGreaterThanOrEqual(1);
      expect(failure).toBeNull();
    });
  });
});
