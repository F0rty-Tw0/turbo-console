import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkoutProblemsOf, permissionProblemsOf, storeProblemsOf, usesProblemsOf } from './test/utils/release-workflow.spec.util.ts';
import { injectionProblemsOf, tokenProblemsOf } from './test/utils/workflow-run.spec.util.ts';

const ROOT = join(import.meta.dirname, '../../../../');
const SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1';
const PINNED_STEP = ['      # SHA = actions/checkout@v7.0.1', `      - uses: actions/checkout@${SHA}`];
const PIN_UNPINNED = ['      # SHA = actions/checkout@v7.0.1', '      - uses: actions/checkout@v7'];
const PIN_OTHER_NAME = ['      # SHA = actions/cache@v6.1.0', `      - uses: actions/checkout@${SHA}`];
const PIN_NO_COMMENT = [`      - uses: actions/checkout@${SHA}`];
const PIN_STALE_COMMENT = [...PINNED_STEP, '', `      - uses: actions/setup-node@${SHA}`];
const JOB = ['jobs:', '  build:', '    steps:'];
const STORE_JOB = ["    if: vars.PUBLISH_MARKETPLACE == 'true'", '    environment: store'];
const PERMISSIONS_OK = ['permissions:', '  contents: read', '', ...JOB];
const PERMISSIONS_WRITE = ['permissions:', '  contents: write', '', ...JOB];
const WRITE_IN_PACKAGE = [...PERMISSIONS_OK, '    permissions:', '      contents: write'];
const WRITE_TWICE = [...PERMISSIONS_OK, '  github-release:', '    permissions:', '      contents: write', '      contents: write'];
const STEPS = [...JOB, `      - uses: actions/checkout@${SHA}`, '        with:'];
const CHECKOUT_BARE = [...STEPS, '          fetch-depth: 0'];
const CHECKOUT_SAFE = [...STEPS, '          persist-credentials: false'];
const RUN_INLINE = [...JOB, '      - run: echo ${{ github.ref_name }}'];
const RUN_BLOCK = [...JOB, '      - run: |', '          echo "$TAG"', '          echo ${{ github.ref_name }}'];
const RUN_INDICATOR = [...JOB, '      - run: |2', '          echo "$TAG"', '          echo ${{ github.ref_name }}'];
const RUN_HEADER_COMMENT = [...JOB, '      - run: | # package', '          echo ${{ github.ref_name }}'];
const RUN_PLAIN_CONTINUED = [...JOB, '      - run: echo "$TAG"', '          ${{ github.ref_name }}'];
const RUN_SAFE = [...JOB, '      - run: |', '          echo "$TAG"', '        env:', '          TAG: ${{ github.ref_name }}'];
const TOKEN_JOB_ENV = [...JOB, '    env:', '      VSCE_PAT: ${{ secrets.VSCE_PAT }}'];
const TOKEN_RUN = [...JOB, '      - run: vsce publish --pat "$VSCE_PAT"'];
const TOKEN_STEP_ENV = [...JOB, '      - run: vsce publish', '        env:', '          VSCE_PAT: ${{ secrets.VSCE_PAT }}'];
const TOKEN_COMMENT = ['# VSCE_PAT and OVSX_PAT live in the store environment.', ...JOB];

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

      expect(result).toHaveLength(1);
    });

    it('WHEN the comment names another action THEN that line is listed', () => {
      const result = usesProblemsOf(joined(PIN_OTHER_NAME));

      expect(result).toHaveLength(1);
    });

    it('WHEN the comment is missing THEN that line is listed', () => {
      const result = usesProblemsOf(joined(PIN_NO_COMMENT));

      expect(result).toHaveLength(1);
    });

    it('WHEN only a previous step has a comment THEN the later step is listed', () => {
      const result = usesProblemsOf(joined(PIN_STALE_COMMENT));

      expect(result).toHaveLength(1);
    });
  });

  describe('GIVEN the permissions', () => {
    it('WHEN the repo release.yml is read THEN the top block is contents: read and the only write is github-release', () => {
      const result = permissionProblemsOf(RELEASE);

      expect(result).toStrictEqual([]);
    });

    it('WHEN the top block grants write THEN it is listed', () => {
      const result = permissionProblemsOf(joined(PERMISSIONS_WRITE));

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('WHEN another job than github-release grants write THEN it is listed', () => {
      const result = permissionProblemsOf(joined(WRITE_IN_PACKAGE));

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('WHEN github-release grants write twice THEN it is listed', () => {
      const result = permissionProblemsOf(joined(WRITE_TWICE));

      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GIVEN the publish jobs', () => {
    it('WHEN the repo release.yml is read THEN each has environment: store and its vars gate', () => {
      const marketplace = storeProblemsOf(RELEASE, 'publish-marketplace', 'PUBLISH_MARKETPLACE');
      const openvsx = storeProblemsOf(RELEASE, 'publish-openvsx', 'PUBLISH_OPENVSX');

      expect([...marketplace, ...openvsx]).toStrictEqual([]);
    });

    it('WHEN a job has both THEN no problem is listed', () => {
      const workflow = joined(['jobs:', '  publish-marketplace:', ...STORE_JOB]);

      const result = storeProblemsOf(workflow, 'publish-marketplace', 'PUBLISH_MARKETPLACE');

      expect(result).toStrictEqual([]);
    });

    it('WHEN the environment is missing THEN it is listed', () => {
      const workflow = joined(['jobs:', '  publish-marketplace:', STORE_JOB[0] ?? '']);

      const result = storeProblemsOf(workflow, 'publish-marketplace', 'PUBLISH_MARKETPLACE');

      expect(result).toHaveLength(1);
    });

    it('WHEN the vars gate is missing THEN it is listed', () => {
      const workflow = joined(['jobs:', '  publish-marketplace:', STORE_JOB[1] ?? '']);

      const result = storeProblemsOf(workflow, 'publish-marketplace', 'PUBLISH_MARKETPLACE');

      expect(result).toHaveLength(1);
    });

    it('WHEN the gate names the other variable THEN it is listed', () => {
      const workflow = joined(['jobs:', '  publish-openvsx:', ...STORE_JOB]);

      const result = storeProblemsOf(workflow, 'publish-openvsx', 'PUBLISH_OPENVSX');

      expect(result).toHaveLength(1);
    });
  });

  describe('GIVEN checkout steps', () => {
    it('WHEN the repo release.yml is read THEN every one has persist-credentials: false', () => {
      const result = checkoutProblemsOf(RELEASE);

      expect(result).toStrictEqual([]);
    });

    it('WHEN a checkout sets persist-credentials: false THEN no problem is listed', () => {
      const result = checkoutProblemsOf(joined(CHECKOUT_SAFE));

      expect(result).toStrictEqual([]);
    });

    it('WHEN a checkout leaves it out THEN that step is listed', () => {
      const result = checkoutProblemsOf(joined(CHECKOUT_BARE));

      expect(result).toHaveLength(1);
    });
  });

  describe('GIVEN run bodies', () => {
    it('WHEN the repo release.yml is read THEN none holds an expression', () => {
      const result = injectionProblemsOf(RELEASE);

      expect(result).toStrictEqual([]);
    });

    it('WHEN the expression sits in env only THEN no problem is listed', () => {
      const result = injectionProblemsOf(joined(RUN_SAFE));

      expect(result).toStrictEqual([]);
    });

    it('WHEN an inline run holds an expression THEN it is listed', () => {
      const result = injectionProblemsOf(joined(RUN_INLINE));

      expect(result).toHaveLength(1);
    });

    it('WHEN a block run holds an expression THEN that line is listed', () => {
      const result = injectionProblemsOf(joined(RUN_BLOCK));

      expect(result).toHaveLength(1);
    });
  });

  describe('GIVEN run bodies under other block shapes', () => {
    it('WHEN the header has an indentation indicator THEN the expression line is listed', () => {
      const result = injectionProblemsOf(joined(RUN_INDICATOR));

      expect(result).toStrictEqual(['run body holds an expression: echo ${{ github.ref_name }}']);
    });

    it('WHEN the header has a trailing comment THEN the expression line is listed', () => {
      const result = injectionProblemsOf(joined(RUN_HEADER_COMMENT));

      expect(result).toStrictEqual(['run body holds an expression: echo ${{ github.ref_name }}']);
    });

    it('WHEN a plain value continues on the next line THEN the expression line is listed', () => {
      const result = injectionProblemsOf(joined(RUN_PLAIN_CONTINUED));

      expect(result).toStrictEqual(['run body holds an expression: ${{ github.ref_name }}']);
    });
  });

  describe('GIVEN the store tokens', () => {
    it('WHEN the repo release.yml is read THEN they sit only under a step-level env', () => {
      const result = tokenProblemsOf(RELEASE);

      expect(result).toStrictEqual([]);
    });

    it('WHEN a token sits in a step env or a comment THEN no problem is listed', () => {
      const inEnv = tokenProblemsOf(joined(TOKEN_STEP_ENV));
      const inComment = tokenProblemsOf(joined(TOKEN_COMMENT));

      expect([...inEnv, ...inComment]).toStrictEqual([]);
    });

    it('WHEN a token sits in a job env THEN it is listed', () => {
      const result = tokenProblemsOf(joined(TOKEN_JOB_ENV));

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('WHEN a token is named in a run body THEN it is listed', () => {
      const result = tokenProblemsOf(joined(TOKEN_RUN));

      expect(result).toHaveLength(1);
    });
  });
});
