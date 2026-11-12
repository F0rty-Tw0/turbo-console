import { describe, expect, it } from 'vitest';

import { argsErrorText, pickerPlaceholderOf, scriptArgsPromptOf, turboArgsPromptOf } from './run-options-text.util.ts';
import { ARGS_PLACEHOLDER, CONCURRENCY_MESSAGE, CONCURRENCY_PLACEHOLDER, CONCURRENCY_PROMPT } from '../common/run-options.const.ts';

describe('FEATURE: Run with Options texts', () => {
  it('GIVEN a task and a package WHEN the picker placeholder is asked THEN it ends in an ellipsis', () => {
    expect(pickerPlaceholderOf('build', 'a')).toBe('Run build in a with…');
  });

  it('GIVEN a turbo task WHEN the args prompt is asked THEN it names the task', () => {
    expect(turboArgsPromptOf('build')).toBe('Arguments for every build task in the run (after --)');
  });

  it.each(['npm', 'pnpm', 'yarn', 'bun'] as const)('GIVEN manager %s WHEN the script prompt is asked THEN it names it', (pm) => {
    expect(scriptArgsPromptOf(pm, 'lint')).toBe(`Arguments for ${pm} run lint`);
  });

  it('GIVEN position 2 and arg $x WHEN the error is asked THEN the rule text', () => {
    expect(argsErrorText(2, '$x')).toBe(
      'Argument 2 ("$x") can only use letters, digits and @ / . _ : = + -, and cannot start with = or @'
    );
  });

  it('GIVEN the box consts WHEN read THEN the spec words', () => {
    expect([CONCURRENCY_PROMPT, CONCURRENCY_PLACEHOLDER, CONCURRENCY_MESSAGE, ARGS_PLACEHOLDER]).toStrictEqual([
      'Concurrency for this run (--concurrency)',
      'e.g. 1, 4 or 50%',
      'Enter a whole number of at least 1, or a percentage such as 50%.',
      'e.g. --watch --port=3000'
    ]);
  });
});
