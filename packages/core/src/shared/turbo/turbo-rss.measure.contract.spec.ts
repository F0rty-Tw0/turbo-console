import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { SKIP_INFER } from './common/turbo-args.const.ts';
import { PACKAGE_GRAPH_QUERY } from './common/turbo-query.const.ts';
import { daemonReport } from './test/utils/daemon-report.spec.util.ts';
import { devTurboPath } from './test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from './test/utils/fixture-hook.spec.util.ts';
import { execveChildCount, logMeasurement, peakRssBytes } from './test/utils/peak-rss.spec.util.ts';
import { dryRunArgs } from '../../dry-run/utils/dry-run.util.ts';

type MeasuredCommand = {
  readonly name: string;
  readonly argsIn: (fixtureDir: string) => string[];
};

const TURBO = devTurboPath();

const MEASURE = process.env['TURBO_CONSOLE_MEASURE_RSS'] === '1';

const MIB = 1024 * 1024;

const GIB = 1024 * MIB;

/** Two turbo runs on Windows (pwsh start-up and `Add-Type` included) outlast the 120 s default of one case. */
const CASE_TIMEOUT_MS = 240_000;

const turboJsonSchema = z.object({ tasks: z.record(z.string(), z.unknown()) });

const packageGraphArgs = (): string[] => [SKIP_INFER, 'query', PACKAGE_GRAPH_QUERY];

const dryRunCommandArgs = (fixtureDir: string): string[] => {
  const text = readFileSync(join(fixtureDir, 'turbo.json'), 'utf8');
  const tasks = Object.keys(turboJsonSchema.parse(JSON.parse(text)).tasks);
  const runArgs = dryRunArgs({ tasks });

  return [SKIP_INFER, ...runArgs];
};

const COMMANDS: MeasuredCommand[] = [
  { name: 'packageGraph', argsIn: packageGraphArgs },
  { name: 'dryRun', argsIn: dryRunCommandArgs }
];

describe.runIf(MEASURE)('FEATURE: turbo peak RSS on stretch-300', () => {
  const fixture = fixtureHook(PRESETS['stretch-300']);

  describe.each(COMMANDS)('GIVEN a stretch-300 fixture and the $name command', ({ name, argsIn }) => {
    it(
      'WHEN turbo runs under the OS peak counter THEN the peak is a plausible byte count',
      async () => {
        const { dir } = fixture();
        const args = argsIn(dir);

        const peak = await peakRssBytes(TURBO, args, dir);
        const daemons = await daemonReport();

        logMeasurement(`rss-peak ${process.platform} ${name} ${peak}`);
        logMeasurement(`rss-daemons ${process.platform} ${name} ${daemons}`);
        expect(Number.isFinite(peak)).toBe(true);
        expect(peak).toBeGreaterThan(MIB);
        expect(peak).toBeLessThan(64 * GIB);
      },
      CASE_TIMEOUT_MS
    );

    it(
      'WHEN turbo runs under strace THEN the child process count is logged',
      async () => {
        const { dir } = fixture();
        const args = argsIn(dir);

        const children = await execveChildCount(TURBO, args, dir);

        logMeasurement(`rss-children ${process.platform} ${name} ${children ?? 'strace-missing'}`);
        expect(children === null || children >= 0).toBe(true);
      },
      CASE_TIMEOUT_MS
    );
  });
});
