import { describe, expect, it } from 'vitest';

import { resolveTool, toolIconIdOf, toolOf } from './tool-of.util.ts';
import { NO_SCRIPTS, TOOLS } from '../common/tool.const.ts';
import type { PackageScripts, ToolMatch } from '../common/tool.type.ts';

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

const FAN_OUT_SIZE = 14;
const FAN_OUT_LIMIT_MS = 200;

/** `size` scripts whose bodies all run every script: the paths multiply, no tool is ever reached. */
const fanOutOf = (size: number): Record<string, string> => {
  const names = Array.from({ length: size }, (_, index) => `s${index}`);
  const body = names.map((name) => `npm run ${name}`).join(' && ');
  const entries = names.map((name): [string, string] => [name, body]);

  return Object.fromEntries(entries);
};

/** Above the 165 expansions of the widest realistic root map counted in the slice 1 delta review. */
const WIDE_SIZE = 200;

/** `ci` runs `size` scripts that reach no tool, then `t: vitest`: `size + 2` body expansions, one level deep. */
const wideOf = (size: number): Record<string, string> => {
  const names = Array.from({ length: size }, (_, index) => `w${index}`);
  const runs = [...names, 't'];
  const ci = runs.map((name) => `npm run ${name}`).join(' && ');
  const entries = names.map((name): [string, string] => [name, 'echo ok']);
  const leaves = Object.fromEntries(entries);
  const bodies: Record<string, string> = { ...leaves, t: 'vitest', ci };

  return bodies;
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

/** A repeatable generator: each call returns an integer in `[0, bound)`. */
const seededNext = (start: number): ((bound: number) => number) => {
  let seed = start;

  return (bound) => {
    seed = (seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;

    return Math.floor((seed / LCG_MODULUS) * bound);
  };
};

const randomCommands = (): string[] => {
  const next = seededNext(42);
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

const SCRIPT_COUNT = 7;
const MAP_COUNT = 300;
const SCRIPT_NAMES = Array.from({ length: SCRIPT_COUNT }, (_, index) => `s${index}`);

/** `MAP_COUNT` seeded maps of `s0..s6` whose bodies mostly run another script, so long chains, cycles and tools all occur. */
const randomScriptMaps = (): Record<string, string>[] => {
  const next = seededNext(7);
  const segmentOf = (): string => {
    const roll = next(4);
    const isTool = roll === 0;

    if (isTool) return BIN_NAMES[next(BIN_NAMES.length)] ?? '';

    return `npm run ${SCRIPT_NAMES[next(SCRIPT_COUNT)]}`;
  };
  const bodyOf = (): string => {
    const segments = Array.from({ length: 1 + next(3) }, segmentOf);

    return segments.join(' && ');
  };
  const mapOf = (): Record<string, string> => {
    const entries = SCRIPT_NAMES.map((name): [string, string] => [name, bodyOf()]);

    return Object.fromEntries(entries);
  };

  return Array.from({ length: MAP_COUNT }, mapOf);
};

const runAllIn = (bodies: Record<string, string>): (ToolMatch | null)[] => {
  const scripts = scriptsOf(bodies);

  return SCRIPT_NAMES.map((name) => resolveTool(`npm run ${name}`, scripts));
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

  describe('GIVEN 14 scripts that each run all the others and none reach a tool', () => {
    it('WHEN their shared body is resolved THEN the result is null, and it comes back quickly', () => {
      const bodies = fanOutOf(FAN_OUT_SIZE);
      const scripts = scriptsOf(bodies);
      const command = bodies['s0'] ?? '';
      const startedAt = performance.now();

      const found = resolveTool(command, scripts);
      const elapsed = performance.now() - startedAt;

      expect(found).toBeNull();
      expect(elapsed).toBeLessThan(FAN_OUT_LIMIT_MS);
    });

    it('WHEN a command runs one of them and then vitest THEN the whole call is null', () => {
      const found = resolveTool('npm run s0 && vitest', scriptsOf(fanOutOf(FAN_OUT_SIZE)));

      expect(found).toBeNull();
    });
  });

  describe(`GIVEN ci running ${WIDE_SIZE} tool-less scripts and then t: vitest`, () => {
    it('WHEN npm run ci is resolved THEN it is Vitest via ci and t, within the expansion budget', () => {
      const outcome = outcomeOf('npm run ci', scriptsOf(wideOf(WIDE_SIZE)));

      expect(outcome).toStrictEqual(['vitest', ['ci', 't']]);
    });
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
  });

  describe('GIVEN 300 seeded random script maps of 7 scripts that mostly run each other', () => {
    it('WHEN each script of a random script map is run THEN every result is null or a table row with at most 5 distinct names, and nothing throws', () => {
      const scriptMaps = randomScriptMaps();

      const results = scriptMaps.flatMap(runAllIn);
      const rows = results.filter((match) => match !== null);

      expect(results).toHaveLength(MAP_COUNT * SCRIPT_COUNT);
      expect(rows.every((match) => TOOLS.includes(match.tool))).toBe(true);
      expect(rows.every((match) => match.via.length <= MAX_VIA)).toBe(true);
      expect(rows.every((match) => new Set(match.via).size === match.via.length)).toBe(true);
      expect(rows.some((match) => match.via.length === MAX_VIA)).toBe(true);
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
