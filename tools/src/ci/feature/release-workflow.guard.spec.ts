import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { gateProblemsOf, permissionProblemsOf, storeProblemsOf, usesProblemsOf } from './test/utils/release-workflow.spec.util.ts';

const ROOT = join(import.meta.dirname, '../../../../');
const SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1';
const PINNED_STEP = ['      # SHA = actions/checkout@v7.0.1', `      - uses: actions/checkout@${SHA}`];
const PIN_UNPINNED = ['      # SHA = actions/checkout@v7.0.1', '      - uses: actions/checkout@v7'];
const PIN_OTHER_NAME = ['      # SHA = actions/cache@v6.1.0', `      - uses: actions/checkout@${SHA}`];
const PIN_NO_COMMENT = [`      - uses: actions/checkout@${SHA}`];
const PIN_STALE_COMMENT = [...PINNED_STEP, '', `      - uses: actions/setup-node@${SHA}`];
const JOB = ['jobs:', '  build:', '    steps:'];
const GATE = "github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')";
const STORE_JOB = [`    if: ${GATE} && vars.PUBLISH_MARKETPLACE == 'true'`, '    environment: store'];
const gateMessage = (name: string, tail: string): string => `${name} if: is not exactly: ${GATE}${tail}`;
const RELEASE_JOB = ['  github-release:', '    permissions:', '      contents: write'];
const PERMISSIONS_OK = ['permissions:', '  contents: read', '', ...JOB];
const PERMISSIONS_GOOD = [...PERMISSIONS_OK, ...RELEASE_JOB];
const PERMISSIONS_WRITE = ['permissions:', '  contents: write', '', ...JOB, ...RELEASE_JOB];
const WRITE_IN_PACKAGE = [...PERMISSIONS_OK, '    permissions:', '      contents: write', ...RELEASE_JOB];
const WRITE_TWICE = [...PERMISSIONS_OK, '  github-release:', '    permissions:', '      contents: write', '      contents: write'];
const WRITE_ALL_IN_PACKAGE = [...PERMISSIONS_OK, '    permissions: write-all', ...RELEASE_JOB];
const WRITE_FLOW_IN_PACKAGE = [...PERMISSIONS_OK, '    permissions: { contents: write }', ...RELEASE_JOB];
const WRITE_SPACED_IN_PACKAGE = [...PERMISSIONS_OK, '    permissions:', '      contents:  write', ...RELEASE_JOB];
const WRITE_OTHER_SCOPE = [...PERMISSIONS_OK, '    permissions:', '      id-token: write', ...RELEASE_JOB];
const RELEASE_WITHOUT_WRITE = [...PERMISSIONS_OK, '  github-release:', '    permissions:', '      contents: read'];
const RELEASE_WRITE_ALL = [...PERMISSIONS_OK, '  github-release:', '    permissions: write-all'];

const joined = (lines: string[]): string => lines.join('\n');

const RELEASE = readFileSync(join(ROOT, '.github/workflows/release.yml'), 'utf8');

describe('FEATURE: Release workflow guard', () => {
  describe('GIVEN uses lines', () => {
    it('WHEN the repo release.yml is read THEN every one is SHA-pinned under a matching SHA comment', () => {
      const result = usesProblemsOf(RELEASE);

      expect(result).toStrictEqual([]);
    });

    it('WHEN a pinned step has its SHA comment THEN no problem is listed', () => {
      const result = usesProblemsOf(joined(PINNED_STEP));

      expect(result).toStrictEqual([]);
    });

    it('WHEN a tag stands in for the SHA THEN that line is listed', () => {
      const result = usesProblemsOf(joined(PIN_UNPINNED));

      expect(result).toStrictEqual(['uses is not <owner>/<repo>@<40-hex>: actions/checkout@v7']);
    });

    it('WHEN the comment names another action THEN that line is listed', () => {
      const result = usesProblemsOf(joined(PIN_OTHER_NAME));

      expect(result).toStrictEqual([`uses actions/checkout@${SHA} lacks a matching "# SHA = actions/checkout@v…" comment`]);
    });

    it('WHEN the comment is missing THEN that line is listed', () => {
      const result = usesProblemsOf(joined(PIN_NO_COMMENT));

      expect(result).toStrictEqual([`uses actions/checkout@${SHA} lacks a matching "# SHA = actions/checkout@v…" comment`]);
    });

    it('WHEN only a previous step has a comment THEN the later step is listed', () => {
      const result = usesProblemsOf(joined(PIN_STALE_COMMENT));

      expect(result).toStrictEqual([`uses actions/setup-node@${SHA} lacks a matching "# SHA = actions/setup-node@v…" comment`]);
    });
  });

  describe('GIVEN the permissions', () => {
    it('WHEN the repo release.yml is read THEN the top block is contents: read and the only write is github-release', () => {
      const result = permissionProblemsOf(RELEASE);

      expect(result).toStrictEqual([]);
    });

    it('WHEN only github-release grants contents: write THEN no problem is listed', () => {
      const result = permissionProblemsOf(joined(PERMISSIONS_GOOD));

      expect(result).toStrictEqual([]);
    });

    it('WHEN the top block grants write THEN it is listed', () => {
      const result = permissionProblemsOf(joined(PERMISSIONS_WRITE));

      expect(result).toStrictEqual([
        'top-level permissions is not exactly contents: read: contents: write',
        'write grants appear 2 times, expected 1'
      ]);
    });

    it('WHEN another job than github-release grants write THEN it is listed', () => {
      const result = permissionProblemsOf(joined(WRITE_IN_PACKAGE));

      expect(result).toStrictEqual(['write grants appear 2 times, expected 1', 'write grants sit in: build, github-release']);
    });

    it('WHEN github-release grants write twice THEN it is listed', () => {
      const result = permissionProblemsOf(joined(WRITE_TWICE));

      expect(result).toStrictEqual(['write grants appear 2 times, expected 1']);
    });

    it('WHEN github-release has no contents: write THEN it is listed', () => {
      const result = permissionProblemsOf(joined(RELEASE_WITHOUT_WRITE));

      expect(result).toStrictEqual([
        'write grants appear 0 times, expected 1',
        'write grants sit in: ',
        'github-release lacks contents: write'
      ]);
    });

    it('WHEN github-release uses write-all THEN it lacks contents: write', () => {
      const result = permissionProblemsOf(joined(RELEASE_WRITE_ALL));

      expect(result).toStrictEqual(['github-release lacks contents: write']);
    });

    it('WHEN another job uses write-all THEN it is listed', () => {
      const result = permissionProblemsOf(joined(WRITE_ALL_IN_PACKAGE));

      expect(result).toStrictEqual(['write grants appear 2 times, expected 1', 'write grants sit in: build, github-release']);
    });

    it('WHEN another job uses a flow map THEN it is listed', () => {
      const result = permissionProblemsOf(joined(WRITE_FLOW_IN_PACKAGE));

      expect(result).toStrictEqual(['write grants appear 2 times, expected 1', 'write grants sit in: build, github-release']);
    });

    it('WHEN another job writes with extra spaces THEN it is listed', () => {
      const result = permissionProblemsOf(joined(WRITE_SPACED_IN_PACKAGE));

      expect(result).toStrictEqual(['write grants appear 2 times, expected 1', 'write grants sit in: build, github-release']);
    });

    it('WHEN another job writes another scope THEN it is listed', () => {
      const result = permissionProblemsOf(joined(WRITE_OTHER_SCOPE));

      expect(result).toStrictEqual(['write grants appear 2 times, expected 1', 'write grants sit in: build, github-release']);
    });
  });

  describe('GIVEN the publish jobs', () => {
    it('WHEN the repo release.yml is read THEN each has environment: store and its tag-push and vars gate', () => {
      const marketplace = storeProblemsOf(RELEASE, 'publish-marketplace', 'PUBLISH_MARKETPLACE');
      const openvsx = storeProblemsOf(RELEASE, 'publish-openvsx', 'PUBLISH_OPENVSX');
      const problems = marketplace.concat(openvsx);

      expect(problems).toStrictEqual([]);
    });

    it('WHEN a job has both THEN no problem is listed', () => {
      const workflow = joined(['jobs:', '  publish-marketplace:', ...STORE_JOB]);

      const result = storeProblemsOf(workflow, 'publish-marketplace', 'PUBLISH_MARKETPLACE');

      expect(result).toStrictEqual([]);
    });

    it('WHEN the environment is missing THEN it is listed', () => {
      const workflow = joined(['jobs:', '  publish-marketplace:', STORE_JOB[0] ?? '']);

      const result = storeProblemsOf(workflow, 'publish-marketplace', 'PUBLISH_MARKETPLACE');

      expect(result).toStrictEqual(['publish-marketplace lacks environment: store']);
    });

    it('WHEN the if: is missing THEN it is listed', () => {
      const workflow = joined(['jobs:', '  publish-marketplace:', STORE_JOB[1] ?? '']);

      const result = storeProblemsOf(workflow, 'publish-marketplace', 'PUBLISH_MARKETPLACE');

      expect(result).toStrictEqual([gateMessage('publish-marketplace', " && vars.PUBLISH_MARKETPLACE == 'true'")]);
    });

    it('WHEN the gate names the other variable THEN it is listed', () => {
      const workflow = joined(['jobs:', '  publish-openvsx:', ...STORE_JOB]);

      const result = storeProblemsOf(workflow, 'publish-openvsx', 'PUBLISH_OPENVSX');

      expect(result).toStrictEqual([gateMessage('publish-openvsx', " && vars.PUBLISH_OPENVSX == 'true'")]);
    });

    it('WHEN the event and ref gate is dropped THEN it is listed', () => {
      const workflow = joined([
        'jobs:',
        '  publish-marketplace:',
        "    if: vars.PUBLISH_MARKETPLACE == 'true'",
        '    environment: store'
      ]);

      const result = storeProblemsOf(workflow, 'publish-marketplace', 'PUBLISH_MARKETPLACE');

      expect(result).toStrictEqual([gateMessage('publish-marketplace', " && vars.PUBLISH_MARKETPLACE == 'true'")]);
    });

    it('WHEN the gate ends in || true THEN it is listed', () => {
      const workflow = joined(['jobs:', '  publish-marketplace:', `${STORE_JOB[0]} || true`, '    environment: store']);

      const result = storeProblemsOf(workflow, 'publish-marketplace', 'PUBLISH_MARKETPLACE');

      expect(result).toStrictEqual([gateMessage('publish-marketplace', " && vars.PUBLISH_MARKETPLACE == 'true'")]);
    });
  });

  describe('GIVEN the github-release gate', () => {
    it('WHEN the repo release.yml is read THEN its if: is the tag-push gate alone', () => {
      const result = gateProblemsOf(RELEASE, 'github-release', null);

      expect(result).toStrictEqual([]);
    });

    it('WHEN the if: is the tag-push gate THEN no problem is listed', () => {
      const workflow = joined(['jobs:', '  github-release:', `    if: ${GATE}`]);

      const result = gateProblemsOf(workflow, 'github-release', null);

      expect(result).toStrictEqual([]);
    });

    it('WHEN the if: is missing THEN it is listed', () => {
      const workflow = joined(['jobs:', '  github-release:', '    needs: package']);

      const result = gateProblemsOf(workflow, 'github-release', null);

      expect(result).toStrictEqual([gateMessage('github-release', '')]);
    });

    it('WHEN the ref clause is dropped THEN it is listed', () => {
      const workflow = joined(['jobs:', '  github-release:', "    if: github.event_name == 'push'"]);

      const result = gateProblemsOf(workflow, 'github-release', null);

      expect(result).toStrictEqual([gateMessage('github-release', '')]);
    });

    it('WHEN the gate ends in || true THEN it is listed', () => {
      const workflow = joined(['jobs:', '  github-release:', `    if: ${GATE} || true`]);

      const result = gateProblemsOf(workflow, 'github-release', null);

      expect(result).toStrictEqual([gateMessage('github-release', '')]);
    });
  });
});
