import { describe, expect, it } from 'vitest';

import { delegationOf } from './delegation.util.ts';
import { BUILTINS_BY_MANAGER, TURBO_BUILTINS } from '../common/delegation.const.ts';
import type { PackageScripts } from '../common/tool.type.ts';

const scriptsOf = (bodies: Record<string, string>, followTurbo = true): PackageScripts => {
  const scripts: PackageScripts = { bodies: new Map(Object.entries(bodies)), followTurbo };

  return scripts;
};
const tokensOf = (command: string): string[] => command.trim().split(/\s+/);
const REPLACED_BUILTINS = ['clean', 'purge', 'setup', 'deploy', 'rebuild', 'rb'];

describe('FEATURE: delegation parser', () => {
  // `start` is the candidate index: 2 for the `npx` row (its wrapper tokens are skipped by the caller), else 0.
  it.each<[string, Record<string, string>, boolean, string | null]>([
    ['npm run test:app', { 'test:app': 'vitest' }, true, 'test:app'],
    ['npm run-script lint', { lint: 'eslint .' }, true, 'lint'],
    ['pnpm test:app', { 'test:app': 'vitest run' }, true, 'test:app'],
    ['pnpm build', {}, true, null],
    ['yarn run -s lint', { lint: 'eslint .' }, true, 'lint'],
    ['pnpm -s lint', { lint: 'eslint .' }, true, 'lint'],
    ['npm -s run lint', { lint: 'eslint .' }, true, 'lint'],
    ['npm test', { test: 'jest' }, true, 'test'],
    ['npm start', { start: 'vite' }, true, 'start'],
    ['npm stop', { stop: 'docker compose down' }, true, 'stop'],
    ['npm restart', { restart: 'docker compose restart' }, true, 'restart'],
    ['npm run missing', {}, true, null],
    ['npm run -- build', { build: 'tsc' }, true, null],
    ['npm run', { run: 'jest' }, true, null],
    ['npm', {}, true, null],
    ['pnpm', {}, true, null],
    ['bun test', { test: 'vitest' }, true, null],
    ['bun run test', { test: 'vitest' }, true, 'test'],
    ['pnpm deploy', { deploy: 'docker compose up' }, true, 'deploy'],
    ['pnpm dedupe', { dedupe: 'docker compose up' }, true, null],
    ['turbo run test', { test: 'vitest' }, true, 'test'],
    ['turbo run test', { test: 'vitest' }, false, null],
    ['turbo test', { test: 'vitest' }, true, 'test'],
    ['turbo prune', { prune: 'docker compose up' }, true, null],
    ['turbo', { run: 'jest' }, true, null],
    ['turbo run', { run: 'jest' }, true, null],
    ['turbo run test --concurrency 2', { test: 'vitest' }, true, 'test'],
    ['turbo run --concurrency 2 test', { test: 'vitest' }, true, 'test'],
    ['turbo run --parallel --concurrency 2 test', { test: 'vitest' }, true, 'test'],
    ['turbo run --continue test', { test: 'vitest' }, true, null],
    ['turbo run --parallel test build', { build: 'tsc', test: 'vitest' }, true, null],
    ['turbo run --dry test build', { build: 'tsc', test: 'vitest' }, true, null],
    ['turbo run --concurrency 2 test', { build: 'tsc', test: 'vitest' }, true, 'test'],
    ['turbo --color run test', { test: 'vitest' }, true, 'test'],
    ['turbo --color run prune', { prune: 'docker compose up' }, true, 'prune'],
    ['turbo run build test', { build: 'tsc', test: 'vitest' }, true, null],
    ['turbo run missing', {}, true, null],
    ['pnpm turbo run test --concurrency 2', { test: 'vitest' }, true, 'test'],
    ['pnpm turbo run test', { turbo: 'jest', test: 'vitest' }, true, 'turbo'],
    ['pnpm turbo run test', { test: 'vitest' }, false, null],
    ['yarn turbo test', { test: 'vitest' }, true, 'test'],
    ['npm turbo run test', { test: 'vitest' }, true, null],
    ['pnpm build -- -w', { build: 'tsc' }, true, 'build'],
    ['npm run build -- --watch', { build: 'tsc' }, true, 'build'],
    ['pnpm --filter web test', { test: 'vitest' }, true, null],
    ['pnpm --filter=web test', { test: 'vitest' }, true, null],
    ['pnpm -Fweb test', { test: 'vitest' }, true, null],
    ['pnpm -r test', { test: 'vitest' }, true, null],
    ['npm run test --workspaces', { test: 'vitest' }, true, null],
    ['turbo run test --filter=web', { test: 'vitest' }, true, null],
    ['./node_modules/.bin/turbo run test', { test: 'vitest' }, true, 'test'],
    ['npm.cmd run lint', { lint: 'eslint .' }, true, 'lint'],
    ['PNPM.EXE test:app', { 'test:app': 'vitest' }, true, 'test:app'],
    ['vitest run', { run: 'jest' }, true, null],
    ['npm install', { install: 'x' }, true, null],
    ['turbo run test -- a b', { test: 'vitest' }, true, 'test'],
    ['npx --workspace=web turbo run test', { test: 'vitest' }, true, null],
    ['npx turbo run test', { test: 'vitest' }, true, 'test']
  ])(
    'GIVEN the tokens of %j and scripts %j (followTurbo %s) WHEN the delegation is read THEN it is %j',
    (command, bodies, followTurbo, expected) => {
      const tokens = tokensOf(command);
      const turboIndex = tokens.indexOf('turbo');
      const start = tokens[0] === 'npx' ? turboIndex : 0;

      const name = delegationOf(tokens, start, scriptsOf(bodies, followTurbo));

      expect(name).toBe(expected);
    }
  );

  describe.each([...BUILTINS_BY_MANAGER])('GIVEN the %s built-in commands', (manager, builtins) => {
    it('WHEN a script has the same name THEN the built-in wins and nothing is followed', () => {
      const names = [...builtins];

      const followed = names.filter((name) => delegationOf([manager, name], 0, scriptsOf({ [name]: 'vitest' })) !== null);

      expect(followed).toStrictEqual([]);
    });
  });

  it('GIVEN the turbo built-in commands WHEN a script has the same name THEN the shorthand is not followed', () => {
    const names = [...TURBO_BUILTINS];

    const followed = names.filter((name) => delegationOf(['turbo', name], 0, scriptsOf({ [name]: 'vitest' })) !== null);

    expect(followed).toStrictEqual([]);
  });

  it('GIVEN pnpm and a script named like a command pnpm 11+ no longer owns WHEN the delegation is read THEN the script is followed', () => {
    const names = REPLACED_BUILTINS.map((name) => delegationOf(['pnpm', name], 0, scriptsOf({ [name]: 'vitest' })));

    expect(names).toStrictEqual(REPLACED_BUILTINS);
  });
});
