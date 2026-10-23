import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FullResult } from '@playwright/test/reporter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/naming-convention -- Playwright loads a reporter through its default export, a class
import BenchReporter from './bench-reporter.ts';
import type { BenchSample } from './common/bench.type.ts';
import { sampleAnnotation } from './utils/bench-results.util.ts';

const passed: FullResult = { status: 'passed', startTime: new Date(), duration: 1 };
const failed: FullResult = { status: 'failed', startTime: new Date(), duration: 1 };

const sample = (name: string, ms: number): BenchSample => {
  const built: BenchSample = { name, ms, gate: false };

  return built;
};

describe('FEATURE: bench reporter', () => {
  let directory = '';
  let outputFile = '';

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'bench-reporter-'));
    outputFile = join(directory, 'nested', 'results.json');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  describe('GIVEN collected samples, a note and a foreign annotation', () => {
    it('WHEN a passed run ends THEN results.json holds only the rows', async () => {
      const reporter = new BenchReporter({ outputFile });

      reporter.collect([
        sampleAnnotation(sample('a', 2)),
        { type: 'bench-note', description: 'long-task-ms 4' },
        { type: 'pan-cpu-ms' }
      ]);

      const status = await reporter.onEnd(passed);

      expect(status).toBeUndefined();
      expect(JSON.parse(readFileSync(outputFile, 'utf8'))).toStrictEqual([
        { name: 'webview-ui/a', medianNs: 2_000_000, samples: 1, gate: false }
      ]);
    });
  });

  describe('GIVEN a stale results file', () => {
    it('WHEN the run begins and a failed run ends THEN no file exists', async () => {
      const reporter = new BenchReporter({ outputFile: join(directory, 'results.json') });

      writeFileSync(join(directory, 'results.json'), '[]');
      reporter.onBegin();
      reporter.collect([sampleAnnotation(sample('a', 2))]);

      await reporter.onEnd(failed);

      expect(existsSync(join(directory, 'results.json'))).toBe(false);
    });
  });

  describe('GIVEN a passed run with no samples', () => {
    it('WHEN it ends THEN the status is failed and no file is written', async () => {
      const reporter = new BenchReporter({ outputFile });

      const status = await reporter.onEnd(passed);

      expect(status).toStrictEqual({ status: 'failed' });
      expect(existsSync(outputFile)).toBe(false);
    });
  });

  describe('GIVEN a reporter', () => {
    it('WHEN asked whether it prints to stdio THEN it answers false', () => {
      const reporter = new BenchReporter({ outputFile });

      expect(reporter.printsToStdio()).toBe(false);
    });
  });
});
