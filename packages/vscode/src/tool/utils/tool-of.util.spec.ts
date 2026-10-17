import { describe, expect, it } from 'vitest';

import { toolIconIdOf, toolOf } from './tool-of.util.ts';
import { TOOLS } from '../common/tool.const.ts';

const idOf = (command: string | null): string | null => toolOf(command)?.id ?? null;

const BASE_CHARS = Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789=-/\\.&|; \t\n');
const ALPHABET = [...BASE_CHARS, '\u202e', 'é'];
const BIN_NAMES = TOOLS.flatMap((tool) => tool.bins);
const WRAPPERS = ['npx', 'pnpm exec', 'FOO=1', '-x', 'cross-env', '--'];
const SEPARATORS = ['&&', '||', '|', ';'];
const PARTS = [...BIN_NAMES, ...WRAPPERS, ...SEPARATORS];
const SAMPLE_COUNT = 2000;
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;
const LCG_MODULUS = 2 ** 32;

const randomCommands = (): string[] => {
  let seed = 42;
  const next = (bound: number): number => {
    seed = (seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;

    return Math.floor((seed / LCG_MODULUS) * bound);
  };
  const noiseOf = (): string => {
    const chars = Array.from({ length: next(8) }, () => ALPHABET[next(ALPHABET.length)]);

    return chars.join('');
  };
  const partOf = (): string => {
    const roll = next(4);

    if (roll === 0) return noiseOf();

    return PARTS[next(PARTS.length)] ?? '';
  };
  const commands = Array.from({ length: SAMPLE_COUNT }, () => {
    const parts = Array.from({ length: 1 + next(6) }, partOf);

    return parts.join(' ');
  });

  return commands;
};

describe('FEATURE: tool detection', () => {
  it.each<[string, string]>([
    ['vitest run', 'vitest'],
    ['vitest', 'vitest'],
    ['VITEST', 'vitest'],
    ['NODE_ENV=test vitest', 'vitest'],
    ['npx --yes vitest', 'vitest'],
    ['NODE_ENV=x --inspect vitest', 'vitest'],
    ['NODE_OPTIONS=--max-old-space-size=4096 pnpm exec vitest run', 'vitest'],
    ['\n  vitest run', 'vitest'],
    ['vitest\trun', 'vitest'],
    ['cross-env NODE_ENV=test jest --ci', 'jest'],
    ['cross-env CI=1 npx --yes jest', 'jest'],
    ['pnpm exec eslint .', 'eslint'],
    ['npm exec -- eslint .', 'eslint'],
    ['yarn dlx eslint .', 'eslint'],
    ['pnpm dlx prettier --check .', 'prettier'],
    ['./node_modules/.bin/tsc -b', 'typescript'],
    ['..\\node_modules\\.bin\\TSC.CMD', 'typescript'],
    ['tsc && vite build', 'typescript'],
    ['tsc|tee log', 'typescript'],
    ['playwright test', 'playwright'],
    ['bunx vitest', 'vitest'],
    ['env vitest', 'vitest'],
    ['-- vitest', 'vitest'],
    ['vitest.exe', 'vitest'],
    ['node_modules/.bin/vitest.js', 'vitest']
  ])('GIVEN the command %j WHEN its tool is read THEN it is %s', (command, id) => {
    const found = idOf(command);

    expect(found).toBe(id);
  });

  it.each<[string | null]>([
    ['rm -rf dist && tsc'],
    ['pnpm run build'],
    ['yarn build'],
    ['node scripts/x.js'],
    ['dotenv -e .env -- vitest'],
    ['vitest-foo'],
    ['vite.config.js'],
    ['eslint\u202e .'],
    ['FOO=1; vitest'],
    ['--foo vitest'],
    ['pnpm'],
    [null],
    [''],
    ['   ']
  ])('GIVEN the command %j WHEN its tool is read THEN there is none', (command) => {
    const found = toolOf(command);

    expect(found).toBeNull();
  });

  describe('GIVEN 2000 seeded random commands mixing bins, wrappers, separators and noise', () => {
    it('WHEN each is read THEN the result is null or a table row, some are rows, and nothing throws', () => {
      const commands = randomCommands();

      const results = commands.map((command) => toolOf(command));
      const rows = results.filter((tool) => tool !== null);

      expect(results).toHaveLength(SAMPLE_COUNT);
      expect(rows.every((tool) => TOOLS.includes(tool))).toBe(true);
      expect(rows.length).toBeGreaterThan(500);
    });
  });
});

describe('FEATURE: tool icon id', () => {
  it('GIVEN a tool with a glyph WHEN its icon id is read THEN it is the prefix plus the id', () => {
    const rows = TOOLS.filter((tool) => tool.id === 'vitest');

    const iconIds = rows.map((tool) => toolIconIdOf(tool));

    expect(iconIds).toStrictEqual(['turbo-console-vitest']);
  });

  it('GIVEN a tool without a glyph WHEN its icon id is read THEN it is null', () => {
    const rows = TOOLS.filter((tool) => tool.id === 'playwright');

    const iconIds = rows.map((tool) => toolIconIdOf(tool));

    expect(iconIds).toStrictEqual([null]);
  });
});
