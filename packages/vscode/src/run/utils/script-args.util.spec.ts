import { describe, expect, it } from 'vitest';

import { scriptArgsOf } from './script-args.util.ts';

const ARGS = ['--watch', '--port=3000', './src/a.ts', '--env=dev:local'];

describe('FEATURE: script argv', () => {
  describe.each([
    ['npm', ['run', 'lint', '--', ...ARGS]],
    ['pnpm', ['run', 'lint', ...ARGS]],
    ['yarn', ['run', 'lint', ...ARGS]],
    ['bun', ['run', 'lint', ...ARGS]]
  ] as const)('GIVEN %s and four args', (manager, expected) => {
    const argv = JSON.stringify(expected);

    it(`WHEN the argv is built THEN it is ${argv}`, () => {
      expect(scriptArgsOf(manager, 'lint', ARGS)).toStrictEqual(expected);
    });
  });

  describe.each(['npm', 'pnpm', 'yarn', 'bun'] as const)('GIVEN %s and no args', (manager) => {
    it("WHEN built THEN it is today's argv, with no --", () => {
      expect(scriptArgsOf(manager, 'lint', [])).toStrictEqual(['run', 'lint']);
    });
  });

  describe('GIVEN args', () => {
    it('WHEN built THEN the input list is not mutated and the result is a new array', () => {
      const input = [...ARGS];

      const argv = scriptArgsOf('npm', 'lint', input);

      expect(input).toStrictEqual(ARGS);
      expect(argv).not.toBe(input);
    });
  });

  describe('GIVEN an arg a shell would act on', () => {
    it('WHEN built THEN it throws invalid-argument', () => {
      expect(() => scriptArgsOf('npm', 'lint', ['a;b'])).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
    });
  });
});
