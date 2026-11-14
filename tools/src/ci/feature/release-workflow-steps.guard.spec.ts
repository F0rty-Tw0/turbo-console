import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkoutProblemsOf } from './test/utils/release-workflow.spec.util.ts';
import { injectionProblemsOf, tokenProblemsOf } from './test/utils/workflow-run.spec.util.ts';
import { preReleaseProblemsOf, tagGuardProblemsOf } from './test/utils/workflow-safety.spec.util.ts';

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

const PACKAGE_JOB = ['jobs:', '  package:', '    steps:'];
const GUARD_STEP = [
  ...PACKAGE_JOB,
  '      - name: Guard the tag and write the notes',
  '        id: release',
  '        env:',
  "          IS_TAG: ${{ github.event_name == 'push' }}",
  '          TAG: ${{ github.ref_name }}',
  '        run: |',
  `          if [ "$IS_TAG" = 'true' ]; then`,
  '            node tools/src/release/release.ts --tag "$TAG"',
  '          else',
  '            node tools/src/release/release.ts',
  '          fi'
];
const GUARD_OK = GUARD_STEP.join('\n');
const GUARD_NO_TAG_FLAG = GUARD_OK.replace(' --tag "$TAG"', '');
const GUARD_NEVER_TAG = GUARD_OK.replace("github.event_name == 'push'", "github.event_name == 'never'");
const GUARD_NO_TAG_ENV = GUARD_OK.replace('TAG: ${{ github.ref_name }}', 'TAG: v0.0.0');
const PRE_RELEASE_EXPRESSION = "${{ steps.release.outputs.channel == 'pre-release' && '1' || '0' }}";
const PACKAGE_STEP = [
  ...PACKAGE_JOB,
  '      - name: Package',
  '        env:',
  `          VSCE_PRE_RELEASE: ${PRE_RELEASE_EXPRESSION}`
];
const PACKAGE_OK = PACKAGE_STEP.join('\n');
const PACKAGE_ALWAYS_STABLE = PACKAGE_OK.replace(PRE_RELEASE_EXPRESSION, "'0'");
const PACKAGE_OTHER_OUTPUT = PACKAGE_OK.replace('outputs.channel', 'outputs.version');
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

  describe('GIVEN the tag guard step', () => {
    it('WHEN the repo release.yml is read THEN a tag push runs release.ts --tag "$TAG"', () => {
      const result = tagGuardProblemsOf(RELEASE);

      expect(result).toStrictEqual([]);
    });

    it('WHEN the step passes --tag on a tag push THEN no problem is listed', () => {
      const result = tagGuardProblemsOf(GUARD_OK);

      expect(result).toStrictEqual([]);
    });

    it('WHEN the --tag flag is dropped THEN it is listed', () => {
      const result = tagGuardProblemsOf(GUARD_NO_TAG_FLAG);

      expect(result).toStrictEqual([
        'release guard step does not run right after the tag check: node tools/src/release/release.ts --tag "$TAG"'
      ]);
    });

    it('WHEN IS_TAG is no longer true on a push THEN it is listed', () => {
      const result = tagGuardProblemsOf(GUARD_NEVER_TAG);

      expect(result).toStrictEqual(["release guard step lacks the line: IS_TAG: ${{ github.event_name == 'push' }}"]);
    });

    it('WHEN TAG is not the pushed ref name THEN it is listed', () => {
      const result = tagGuardProblemsOf(GUARD_NO_TAG_ENV);

      expect(result).toStrictEqual(['release guard step lacks the line: TAG: ${{ github.ref_name }}']);
    });

    it('WHEN the guard step is missing THEN every line is listed', () => {
      const result = tagGuardProblemsOf(joined(PACKAGE_JOB));

      expect(result).toStrictEqual([
        "release guard step lacks the line: IS_TAG: ${{ github.event_name == 'push' }}",
        'release guard step lacks the line: TAG: ${{ github.ref_name }}',
        `release guard step lacks the line: if [ "$IS_TAG" = 'true' ]; then`,
        'release guard step does not run right after the tag check: node tools/src/release/release.ts --tag "$TAG"'
      ]);
    });
  });

  describe('GIVEN the Package step', () => {
    it('WHEN the repo release.yml is read THEN VSCE_PRE_RELEASE follows the release channel', () => {
      const result = preReleaseProblemsOf(RELEASE);

      expect(result).toStrictEqual([]);
    });

    it('WHEN the flag derives from the channel output THEN no problem is listed', () => {
      const result = preReleaseProblemsOf(PACKAGE_OK);

      expect(result).toStrictEqual([]);
    });

    it('WHEN the flag is forced to a constant THEN it is listed', () => {
      const result = preReleaseProblemsOf(PACKAGE_ALWAYS_STABLE);

      expect(result).toStrictEqual([`package lacks the line: VSCE_PRE_RELEASE: ${PRE_RELEASE_EXPRESSION}`]);
    });

    it('WHEN the flag reads another output THEN it is listed', () => {
      const result = preReleaseProblemsOf(PACKAGE_OTHER_OUTPUT);

      expect(result).toStrictEqual([`package lacks the line: VSCE_PRE_RELEASE: ${PRE_RELEASE_EXPRESSION}`]);
    });
  });
});
