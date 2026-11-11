import { describe, expect, it } from 'vitest';

import { scriptArgsOf } from './script-args.util.ts';

const ARGS = ['--watch', '--port=3000', './src/a.ts', '--env=dev:local'];

describe('FEATURE: script argv', () => {
  it.each([
    ['npm', ['run', 'lint', '--', ...ARGS]],
    ['pnpm', ['run', 'lint', ...ARGS]],
    ['yarn', ['run', 'lint', ...ARGS]],
    ['bun', ['run', 'lint', ...ARGS]]
  ] as const)('GIVEN %s and four args WHEN the argv is built THEN it is %j', (manager, expected) => {
    expect(scriptArgsOf(manager, 'lint', ARGS)).toStrictEqual(expected);
  });

  it.each(['npm', 'pnpm', 'yarn', 'bun'] as const)(
    "GIVEN %s and no args WHEN built THEN it is today's argv, with no --",
    (manager) => {
      expect(scriptArgsOf(manager, 'lint', [])).toStrictEqual(['run', 'lint']);
    }
  );

  it('GIVEN args WHEN built THEN the input list is not mutated and the result is a new array', () => {
    const input = [...ARGS];

    const argv = scriptArgsOf('npm', 'lint', input);

    expect(input).toStrictEqual(ARGS);
    expect(argv).not.toBe(input);
  });

  it('GIVEN an arg a shell would act on WHEN built THEN it throws invalid-argument', () => {
    expect(() => scriptArgsOf('npm', 'lint', ['a;b'])).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
  });
});
