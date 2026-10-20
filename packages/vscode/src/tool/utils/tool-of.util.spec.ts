import { describe, expect, it } from 'vitest';

import { resolveTool, toolIconIdOf, toolOf } from './tool-of.util.ts';
import { NO_SCRIPTS, TOOLS } from '../common/tool.const.ts';
import type { PackageScripts } from '../common/tool.type.ts';

const idOf = (command: string | null): string | null => resolveTool(command, NO_SCRIPTS)?.tool.id ?? null;

const scriptsOf = (bodies: Record<string, string>, followTurbo = true): PackageScripts => {
  const scripts: PackageScripts = { bodies: new Map(Object.entries(bodies)), followTurbo };

  return scripts;
};

const chainOf = (length: number): Record<string, string> => {
  const names = Array.from({ length }, (_, index) => `d${index + 1}`);
  const entries = names.map((name, index): [string, string] => [name, index === length - 1 ? 'vitest' : `npm run d${index + 2}`]);

  return Object.fromEntries(entries);
};

const MAX_VIA = 5;

type Outcome = [string | null, string[]];
const NO_OUTCOME: Outcome = [null, []];

const outcomeOf = (command: string, scripts: PackageScripts): Outcome => {
  const match = resolveTool(command, scripts);

  if (match === null) return NO_OUTCOME;

  const outcome: Outcome = [match.tool.id, match.via];

  return outcome;
};

const BASE_CHARS = Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789=-/\\.&|; \t\n');
const ALPHABET = [...BASE_CHARS, '\u202e', 'é'];
const BIN_NAMES = TOOLS.flatMap((tool) => tool.bins);
const WRAPPERS = ['npx', 'pnpm exec', 'FOO=1', '-x', 'cross-env', '--'];
const DELEGATIONS = ['npm run s', 'pnpm s', 'turbo run s'];
const SEPARATORS = ['&&', '||', '|', ';'];
const PARTS = [...BIN_NAMES, ...WRAPPERS, ...SEPARATORS, ...DELEGATIONS];
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
    ['rm -rf dist && tsc', 'typescript'],
    ['FOO=1; vitest', 'vitest'],
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
    ['pnpm run build'],
    ['yarn build'],
    ['node scripts/x.js'],
    ['dotenv -e .env -- vitest'],
    ['vitest-foo'],
    ['vite.config.js'],
    ['eslint\u202e .'],
    ['--foo vitest'],
    ['pnpm'],
    [null],
    [''],
    ['   ']
  ])('GIVEN the command %j WHEN its tool is read THEN there is none', (command) => {
    const found = resolveTool(command, NO_SCRIPTS);

    expect(found).toBeNull();
  });

  it.each<[string, Record<string, string>, boolean, Outcome]>([
    ['npm run test:app', { 'test:app': 'vitest' }, true, ['vitest', ['test:app']]],
    ['pnpm deploy', { deploy: 'docker compose up' }, true, ['docker', ['deploy']]],
    ['turbo run test', { test: 'vitest' }, false, [null, []]],
    ['pnpm build && vitest run', { build: 'tsc' }, true, ['typescript', ['build']]],
    ['rm -rf dist && tsc', {}, true, ['typescript', []]],
    ['npm run b', { a: 'npm run b', b: 'npm run a' }, true, [null, []]],
    ['npm run a', { a: 'npm run a' }, true, [null, []]],
    ['npm run d1', chainOf(5), true, ['vitest', ['d1', 'd2', 'd3', 'd4', 'd5']]],
    ['npm run d1', chainOf(6), true, [null, []]],
    ['cross-env CI=1 npm run t', { t: 'playwright test' }, true, ['playwright', ['t']]],
    ['npm run e', { e: '' }, true, [null, []]],
    ['npm run e', { e: '   ' }, true, [null, []]],
    ['npm run x; jest', { x: 'node x.js' }, true, ['jest', []]],
    ['npm run build -- --watch', { build: 'tsc' }, true, ['typescript', ['build']]],
    ['pnpm test:app', { 'test:app': 'vitest run' }, true, ['vitest', ['test:app']]],
    ['yarn run -s lint', { lint: 'eslint .' }, true, ['eslint', ['lint']]],
    ['npm run a', { a: 'npm run b', b: 'npm run c', c: 'tsc' }, true, ['typescript', ['a', 'b', 'c']]],
    ['npm run a; jest', { a: 'npm run a' }, true, ['jest', []]],
    ['npm run a', { a: 'npm run a; vitest' }, true, ['vitest', ['a']]],
    ['npm run a', { a: 'npm run b', b: 'npm run a || vitest' }, true, ['vitest', ['a', 'b']]],
    ['npx --workspace=web turbo run test', { test: 'vitest' }, true, [null, []]]
  ])('GIVEN %j with scripts %j (followTurbo %s) WHEN its tool is resolved THEN it is %j', (command, bodies, followTurbo, expected) => {
    const outcome = outcomeOf(command, scriptsOf(bodies, followTurbo));

    expect(outcome).toStrictEqual(expected);
  });

  describe('GIVEN toolOf, the wrapper without scripts', () => {
    it('WHEN a command is read THEN it is the resolved tool, or null', () => {
      const found = toolOf('rm -rf dist && vitest');
      const none = toolOf('npm run build');

      expect(found?.id).toBe('vitest');
      expect(none).toBeNull();
    });
  });

  describe('GIVEN 2000 seeded random commands mixing bins, wrappers, separators and noise', () => {
    it('WHEN each is read THEN the result is null or a table row, some are rows, and nothing throws', () => {
      const commands = randomCommands();

      const results = commands.map((command) => resolveTool(command, NO_SCRIPTS));
      const rows = results.filter((match) => match !== null);

      expect(results).toHaveLength(SAMPLE_COUNT);
      expect(rows.every((match) => TOOLS.includes(match.tool))).toBe(true);
      expect(rows.length).toBeGreaterThan(500);
    });

    it('WHEN each delegates to a random script body THEN every result is null or a table row with at most 5 names, and nothing throws', () => {
      const commands = randomCommands();
      const bodies = commands.slice().reverse();

      const results = commands.map((command, index) => resolveTool(command, scriptsOf({ s: bodies[index] ?? '' })));
      const rows = results.filter((match) => match !== null);

      expect(results).toHaveLength(SAMPLE_COUNT);
      expect(rows.every((match) => TOOLS.includes(match.tool))).toBe(true);
      expect(rows.every((match) => match.via.length <= MAX_VIA)).toBe(true);
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
