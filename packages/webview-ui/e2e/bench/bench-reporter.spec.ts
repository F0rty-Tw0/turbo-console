import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FullResult } from '@playwright/test/reporter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/naming-convention -- Playwright loads a reporter through its default export, a class
import BenchReporter from './bench-reporter.ts';
import type { BenchSample } from './common/bench.type.ts';
import { BENCH_SAMPLE_STUB } from './test/stubs/bench.stub.ts';
import { noteAnnotation, sampleAnnotation } from './utils/bench-results.util.ts';

const passed: FullResult = { status: 'passed', startTime: new Date(), duration: 1 };
const failed: FullResult = { status: 'failed', startTime: new Date(), duration: 1 };

const SAMPLE: BenchSample = { ...BENCH_SAMPLE_STUB, ms: 2 };

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
      const annotations = [sampleAnnotation(SAMPLE), noteAnnotation('long-task-ms 4'), { type: 'pan-cpu-ms' }];

      reporter.onTestEnd({}, { annotations });

      const status = await reporter.onEnd(passed);
      const written: unknown = JSON.parse(readFileSync(outputFile, 'utf8'));

      expect(status).toBeUndefined();
      expect(written).toStrictEqual([{ name: 'webview-ui/a', medianNs: 2_000_000, samples: 1, gate: false }]);
    });
  });

  describe('GIVEN a stale results file', () => {
    it('WHEN the run begins and a failed run ends THEN no file exists', async () => {
      const staleFile = join(directory, 'results.json');
      const reporter = new BenchReporter({ outputFile: staleFile });
      const annotations = [sampleAnnotation(SAMPLE)];

      writeFileSync(staleFile, '[]');
      reporter.onBegin();
      reporter.onTestEnd({}, { annotations });

      await reporter.onEnd(failed);

      const exists = existsSync(staleFile);

      expect(exists).toBe(false);
    });
  });

  describe('GIVEN a passed run with no samples', () => {
    it('WHEN it ends THEN the status is failed and no file is written', async () => {
      const reporter = new BenchReporter({ outputFile });

      const status = await reporter.onEnd(passed);
      const exists = existsSync(outputFile);

      expect(status).toStrictEqual({ status: 'failed' });
      expect(exists).toBe(false);
    });
  });

  describe('GIVEN a reporter', () => {
    it('WHEN asked whether it prints to stdio THEN it answers false', () => {
      const reporter = new BenchReporter({ outputFile });

      const printsToStdio = reporter.printsToStdio();

      expect(printsToStdio).toBe(false);
    });
  });
});
