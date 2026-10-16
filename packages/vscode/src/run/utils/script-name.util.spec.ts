import { describe, expect, it } from 'vitest';

import { isSafeScriptName, scriptCommandOf } from './script-name.util.ts';
import { quoteArg } from './shell-quote.util.ts';
import type { ShellKind } from '../common/shell.type.ts';
import { seededScriptNames } from '../test/utils/script-names.spec.util.ts';

const SHELL_KINDS: ShellKind[] = ['posix', 'pwsh', 'cmd'];

const SAFE_NAMES = ['lint', 'build:prod', 'test/unit', 'a.b', 'x=y', 'v+1', 'a@1', '_x', '1'];

const REFUSED_NAMES = ['', 'a b', '$x', 'a;b', '-x', '#x', 'a#b', '=x', '@x', 'a\u0007', 'é', 'a"b', 'a`b', 'a|b', 'a&b'];

describe('FEATURE: script name allowlist', () => {
  describe('GIVEN a name of allowlisted characters', () => {
    it.each(SAFE_NAMES)('WHEN %j is checked THEN it is safe', (name) => {
      expect(isSafeScriptName(name)).toBe(true);
    });
  });

  describe('GIVEN a name a shell or the package manager could misread', () => {
    it.each(REFUSED_NAMES)('WHEN %j is checked THEN it is refused', (name) => {
      expect(isSafeScriptName(name)).toBe(false);
    });
  });

  describe('GIVEN 2000 seeded names over the allowlist and 20 shell metacharacters', () => {
    const passing = seededScriptNames().filter(isSafeScriptName);

    it('WHEN the passing ones are counted THEN there are enough for the property to mean something', () => {
      expect(passing.length).toBeGreaterThan(100);
    });

    it.each(SHELL_KINDS)('WHEN every passing name is quoted for %s THEN no shell sees a quote', (kind) => {
      const quoted = passing.map((name) => quoteArg(name, kind));

      expect(quoted).toStrictEqual(passing);
    });
  });
});

describe('FEATURE: script command', () => {
  describe('GIVEN a safe name', () => {
    it.each([
      ['npm', 'npm run lint'],
      ['pnpm', 'pnpm run lint'],
      ['yarn', 'yarn run lint'],
      ['bun', 'bun run lint']
    ] as const)('WHEN the manager is %s THEN the command is %s', (manager, command) => {
      expect(scriptCommandOf(manager, 'lint')).toBe(command);
    });
  });

  describe('GIVEN a refused name', () => {
    it('WHEN the command is built THEN there is none', () => {
      expect(scriptCommandOf('pnpm', 'a b')).toBeNull();
    });
  });
});
