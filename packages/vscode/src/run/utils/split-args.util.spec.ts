import { describe, expect, it } from 'vitest';

import { splitArgs } from './split-args.util.ts';
import type { SplitArgsError } from '../common/run-options.type.ts';

const rule = (n: number, arg: string): SplitArgsError => {
  const result: SplitArgsError = {
    error: `Argument ${n} ("${arg}") can only use letters, digits and @ / . _ : = + -, and cannot start with = or @`
  };

  return result;
};

describe('FEATURE: split the Extra arguments text', () => {
  it('GIVEN the four-arg text WHEN split THEN four args', () => {
    expect(splitArgs('--watch --port=3000 ./src/a.ts --env=dev:local')).toStrictEqual({
      args: ['--watch', '--port=3000', './src/a.ts', '--env=dev:local']
    });
  });

  it.each([[''], ['   '], ['\t\n \r\n']])('GIVEN blank text %j WHEN split THEN no args', (text) => {
    expect(splitArgs(text)).toStrictEqual({ args: [] });
  });

  it.each([['--watch\t--port=3000'], ['--watch --port=3000\n'], ['--watch\r\n--port=3000'], ['  --watch   --port=3000  ']])(
    'GIVEN %j WHEN split THEN exactly two args and no empty one',
    (text) => {
      expect(splitArgs(text)).toStrictEqual({ args: ['--watch', '--port=3000'] });
    }
  );

  it.each([
    ['--name="a b"', 1, '--name="a'],
    ['$HOME', 1, '$HOME'],
    ['a,b', 1, 'a,b'],
    ['@scope/x', 1, '@scope/x'],
    ['=x', 1, '=x'],
    ["it's", 1, "it's"],
    ['--ok --bad$ --worse$', 2, '--bad$'],
    ['ok ="x"', 2, '="x"']
  ])('GIVEN %j WHEN split THEN the first failing arg is named at its 1-based position', (text, n, arg) => {
    expect(splitArgs(text)).toStrictEqual(rule(n, arg));
  });
});
