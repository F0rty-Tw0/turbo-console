import { describe, expect, it } from 'vitest';

import { argsErrorText, pickerPlaceholderOf, scriptArgsPromptOf, turboArgsPromptOf } from './run-options-text.util.ts';
import { ARGS_PLACEHOLDER, CONCURRENCY_MESSAGE, CONCURRENCY_PLACEHOLDER, CONCURRENCY_PROMPT } from '../common/run-options.const.ts';

describe('FEATURE: Run with Options texts', () => {
  describe('GIVEN a task and a package', () => {
    it('WHEN the picker placeholder is asked THEN it ends in an ellipsis', () => {
      expect(pickerPlaceholderOf('build', 'a')).toBe('Run build in a with…');
    });
  });

  describe('GIVEN a turbo task', () => {
    it('WHEN the args prompt is asked THEN it names the task', () => {
      expect(turboArgsPromptOf('build')).toBe('Arguments for every build task in the run (after --)');
    });
  });

  describe.each(['npm', 'pnpm', 'yarn', 'bun'] as const)('GIVEN manager %s', (pm) => {
    it('WHEN the script prompt is asked THEN it names it', () => {
      expect(scriptArgsPromptOf(pm, 'lint')).toBe(`Arguments for ${pm} run lint`);
    });
  });

  describe('GIVEN position 2 and arg $x', () => {
    it('WHEN the error is asked THEN the rule text', () => {
      expect(argsErrorText(2, '$x')).toBe(
        'Argument 2 ("$x") can only use letters, digits and @ / . _ : = + -, and cannot start with = or @'
      );
    });
  });

  describe('GIVEN an arg of 250 characters', () => {
    it('WHEN the error is asked THEN it echoes only the first 200', () => {
      const arg = `${'a'.repeat(200)}${'b'.repeat(50)}`;
      const echoed = 'a'.repeat(200);

      expect(argsErrorText(1, arg)).toBe(
        `Argument 1 ("${echoed}") can only use letters, digits and @ / . _ : = + -, and cannot start with = or @`
      );
    });
  });

  describe('GIVEN the box consts', () => {
    it('WHEN read THEN the spec words', () => {
      expect([CONCURRENCY_PROMPT, CONCURRENCY_PLACEHOLDER, CONCURRENCY_MESSAGE, ARGS_PLACEHOLDER]).toStrictEqual([
        'Concurrency for this run (--concurrency)',
        'e.g. 1, 4 or 50%',
        'Enter a whole number of at least 1, or a percentage such as 50%.',
        'e.g. --watch --port=3000'
      ]);
    });
  });
});
