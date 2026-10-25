import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { budget } from './suite-env.spec.util.ts';
import type { SuiteEnv } from '../common/launch.type.ts';

vi.mock('vscode', () => {
  const vscode = {};

  return vscode;
});

const envIn = (dir: string, budgetFactor: number): SuiteEnv => {
  const missFile = join(dir, 'misses');
  const doneFile = join(dir, 'done');
  const env: SuiteEnv = { manifestFile: null, turboPath: null, budgetFactor, doneFile, missFile };

  return env;
};

describe('FEATURE: budget', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'suite-env-budget-'));
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a finite timing and budget', () => {
    it('WHEN the timing is within the budget THEN it records no miss', () => {
      const env = envIn(dir, 1);

      budget('step', 40, 50, env);

      const isMissed = existsSync(env.missFile);

      expect(isMissed).toBe(false);
    });

    it('WHEN the timing is over the budget THEN it records the miss', async () => {
      const env = envIn(dir, 1);
      const run = (): void => budget('step', 60, 50, env);

      expect(run).toThrow('step took 60.0 ms, over its 50 ms budget');

      const misses = await readFile(env.missFile, 'utf8');

      expect(misses).toBe('step took 60.0 ms, over its 50 ms budget\n');
    });
  });

  describe('GIVEN a non-finite timing', () => {
    it('WHEN it is budgeted THEN it throws without recording a miss', () => {
      const env = envIn(dir, 1);
      const run = (): void => budget('step', Number.NaN, 50, env);

      expect(run).toThrow('step: timing never measured (NaN)');

      const isMissed = existsSync(env.missFile);

      expect(isMissed).toBe(false);
    });
  });

  describe('GIVEN a non-finite budget', () => {
    it('WHEN it is budgeted THEN it throws without recording a miss', () => {
      const env = envIn(dir, 1);
      const run = (): void => budget('step', 40, Number.NaN, env);

      expect(run).toThrow('step: budget not a finite number (NaN)');

      const isMissed = existsSync(env.missFile);

      expect(isMissed).toBe(false);
    });
  });
});
