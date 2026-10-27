import { describe, expect, it } from 'vitest';

import { resolveTool } from './tool-of.util.ts';
import type { PackageScripts } from '../common/tool.type.ts';

type Outcome = [string | null, string[]];
const NO_OUTCOME: Outcome = [null, []];

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
