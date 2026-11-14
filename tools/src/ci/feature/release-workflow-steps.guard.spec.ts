import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkoutProblemsOf } from './test/utils/release-workflow.spec.util.ts';
import { injectionProblemsOf, tokenProblemsOf } from './test/utils/workflow-run.spec.util.ts';

const ROOT = join(import.meta.dirname, '../../../../');
const SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1';
const JOB = ['jobs:', '  build:', '    steps:'];
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

describe('FEATURE: Release workflow step guard', () => {
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

      expect(result).toStrictEqual([`checkout step lacks persist-credentials: false:       - uses: actions/checkout@${SHA}`]);
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

      expect(result).toStrictEqual(['run body holds an expression: echo ${{ github.ref_name }}']);
    });

    it('WHEN a block run holds an expression THEN that line is listed', () => {
      const result = injectionProblemsOf(joined(RUN_BLOCK));

      expect(result).toStrictEqual(['run body holds an expression: echo ${{ github.ref_name }}']);
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

    it('WHEN a token sits in a step env THEN no problem is listed', () => {
      const result = tokenProblemsOf(joined(TOKEN_STEP_ENV));

      expect(result).toStrictEqual([]);
    });

    it('WHEN a token is named in a comment THEN no problem is listed', () => {
      const result = tokenProblemsOf(joined(TOKEN_COMMENT));

      expect(result).toStrictEqual([]);
    });

    it('WHEN a token sits in a job env THEN it is listed', () => {
      const result = tokenProblemsOf(joined(TOKEN_JOB_ENV));

      expect(result).toStrictEqual(['token outside a step-level env: VSCE_PAT: ${{ secrets.VSCE_PAT }}']);
    });

    it('WHEN a token is named in a run body THEN it is listed', () => {
      const result = tokenProblemsOf(joined(TOKEN_RUN));

      expect(result).toStrictEqual(['token outside a step-level env: - run: vsce publish --pat "$VSCE_PAT"']);
    });
  });
});
