import { describe, expect, it } from 'vitest';

import { resolveTool } from './tool-of.util.ts';
import type { PackageScripts } from '../common/tool.type.ts';

type Outcome = [string | null, string[]];
const NO_OUTCOME: Outcome = [null, []];
const SIX_DEEP: Record<string, string> = {
  d1: 'npm run d2',
  d2: 'npm run d3',
  d3: 'npm run d4',
  d4: 'npm run d5',
  d5: 'npm run d6',
  d6: 'vitest'
};
const FIVE_CYCLE: Record<string, string> = {
  d1: 'npm run d2',
  d2: 'npm run d3',
  d3: 'npm run d4',
  d4: 'npm run d5',
  d5: 'npm run d1'
};

const outcomeOf = (command: string, bodies: Record<string, string>): Outcome => {
  const scripts: PackageScripts = { bodies: new Map(Object.entries(bodies)), followTurbo: true };
  const match = resolveTool(command, scripts);

  if (match === null) return NO_OUTCOME;

  const outcome: Outcome = [match.tool.id, match.via];

  return outcome;
};

describe('FEATURE: Node.js and npm as fallback tools', () => {
  describe('GIVEN a command that runs node', () => {
    it.each<[string, Record<string, string>, Outcome]>([
      ['node x.js', {}, ['node', []]],
      ['node --import tsx src/main.ts', {}, ['node', []]],
      ['NODE_OPTIONS=--max-old-space-size=4096 node x.js', {}, ['node', []]],
      ['cross-env NODE_ENV=production node server.js', {}, ['node', []]]
    ])('WHEN %j is resolved with scripts %j THEN it is %j', (command, bodies, expected) => {
      expect(outcomeOf(command, bodies)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a command whose chain reaches npm itself', () => {
    it.each<[string, Record<string, string>, Outcome]>([
      ['npm publish', {}, ['npm', []]],
      ['npm ci', {}, ['npm', []]],
      ['npm run x', { x: 'echo hi' }, ['npm', []]],
      ['npm run missing', {}, ['npm', []]],
      ['pnpm run release', { release: 'npm publish' }, ['npm', ['release']]]
    ])('WHEN %j is resolved with scripts %j THEN it is %j', (command, bodies, expected) => {
      expect(outcomeOf(command, bodies)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a command that also reaches a deeper or later tool', () => {
    it.each<[string, Record<string, string>, Outcome]>([
      ['npm run build', { build: 'vite build' }, ['vite', ['build']]],
      ['npx vitest', {}, ['vitest', []]],
      ['npm exec eslint .', {}, ['eslint', []]],
      ['npm start', { start: 'node server.js' }, ['node', ['start']]],
      ['node scripts/gen.js && vite build', {}, ['vite', []]],
      ['npm run x && tsc', { x: 'echo hi' }, ['typescript', []]],
      ['node a.js && npm publish', {}, ['node', []]]
    ])('WHEN %j is resolved with scripts %j THEN it is %j', (command, bodies, expected) => {
      expect(outcomeOf(command, bodies)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a command that reaches both node and npm', () => {
    it.each<[string, Record<string, string>, Outcome]>([
      ['npm run clean && node server.js', { clean: 'echo hi' }, ['node', []]],
      ['npm ci && node x.js', {}, ['node', []]],
      ['node a.js && npm publish', {}, ['node', []]],
      ['npm ci && npm run s', { s: 'node x.js' }, ['node', ['s']]],
      ['node a.js && npm run s', { s: 'npm ci' }, ['node', []]]
    ])('WHEN %j is resolved with scripts %j THEN node outranks npm: %j', (command, bodies, expected) => {
      expect(outcomeOf(command, bodies)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a chain the depth cap cuts before any tool', () => {
    it.each<[string, Record<string, string>, Outcome]>([
      ['npm run d1', SIX_DEEP, NO_OUTCOME],
      ['npm run d1 && node x.js', SIX_DEEP, ['node', []]],
      ['npm run d1 && npm ci', SIX_DEEP, ['npm', []]],
      ['npm run a', { a: 'npm run a' }, ['npm', ['a']]],
      ['npm run d1', FIVE_CYCLE, ['npm', ['d1', 'd2', 'd3', 'd4', 'd5']]]
    ])(
      'WHEN %j is resolved with scripts %j THEN only a segment the cap did not cut gives a fallback: %j',
      (command, bodies, expected) => {
        expect(outcomeOf(command, bodies)).toStrictEqual(expected);
      }
    );
  });

  describe('GIVEN a command that runs neither node nor npm as its binary', () => {
    it.each<[string, Record<string, string>, Outcome]>([
      ['npx changeset', {}, NO_OUTCOME],
      ['pnpm install', {}, NO_OUTCOME],
      ['echo node npm', {}, NO_OUTCOME]
    ])('WHEN %j is resolved with scripts %j THEN it is %j', (command, bodies, expected) => {
      expect(outcomeOf(command, bodies)).toStrictEqual(expected);
    });
  });
});
