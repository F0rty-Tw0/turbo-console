import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { runSummarySchema } from './common/run-summary.schema.ts';
import type { RunSummary, TurboResult } from './common/turbo.type.ts';
import { runTurbo } from './data-access/run-turbo.ts';
import { fixtureHook } from './test/utils/fixture-hook.spec.util.ts';
import { leafPackage } from './test/utils/manifest.spec.util.ts';
import { optionalKeyPaths } from './test/utils/schema-strictness.spec.util.ts';

const TARGET_LIKE = PRESETS['target-like'];

const PASSING_BUILD = '"build": "node -e 0"';

const FAILING_BUILD = `"build": ${JSON.stringify('node -e "process.exit(3)"')}`;

const HANG_PID_FILE = 'hang.pid';

/** Writes its pid to `HANG_PID_FILE` in the package dir, then never exits on its own within the test. */
const HANGING_BUILD = `"build": ${JSON.stringify(`node -e "require('node:fs').writeFileSync('${HANG_PID_FILE}', String(process.pid)); setTimeout(() => {}, 60000)"`)}`;

const TIMEOUT_MS = 2000;

/** Signal 0 only probes whether `pid` still exists. */
const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

/** The JSON of the one run summary in `dir`; throws unless exactly one exists, so a stale summary cannot be read. */
const readOnlyRunSummary = async (dir: string): Promise<unknown> => {
  const runsDir = join(dir, '.turbo', 'runs');
  const files = await readdir(runsDir);

  if (files.length !== 1) throw new Error(`expected one run summary, found ${files.length}`);

  const text = await readFile(join(runsDir, files.join('')), 'utf8');
  const json: unknown = JSON.parse(text);

  return json;
};

/** Rewrites the package's passing `build` script entry to `buildEntry`. */
const replaceBuild = async (packageDir: string, buildEntry: string): Promise<void> => {
  const manifestFile = join(packageDir, 'package.json');
  const text = await readFile(manifestFile, 'utf8');

  const hasPassingBuild = text.includes(PASSING_BUILD);

  if (!hasPassingBuild) throw new Error(`no ${PASSING_BUILD} in ${manifestFile}`);

  await writeFile(manifestFile, text.replace(PASSING_BUILD, buildEntry));
};

describe('FEATURE: turbo run summary contract on generated fixtures', () => {
  describe('GIVEN a target-like fixture built with --summarize (scenario 3)', () => {
    const fixture = fixtureHook(TARGET_LIKE);

    describe('WHEN the build finishes', () => {
      let result: TurboResult;
      let json: unknown;

      beforeAll(async () => {
        result = await runTurbo(['run', 'build', '--summarize'], fixture().dir);
        json = await readOnlyRunSummary(fixture().dir);
      });

      it('THEN its run summary passes runSummarySchema', () => {
        const summary = runSummarySchema.parse(json);

        expect(result.exitCode).toBe(0);
        expect(summary.execution.exitCode).toBe(0);
        expect(summary.tasks.length).toBeGreaterThan(0);
      });

      it('THEN deleting any key runSummarySchema lists makes it reject the summary', () => {
        const optional = optionalKeyPaths(runSummarySchema, json);

        expect(optional).toStrictEqual([]);
      });
    });
  });

  describe('GIVEN a target-like fixture whose leaf build exits 3, built with --summarize (scenario 3b)', () => {
    const fixture = fixtureHook(TARGET_LIKE);
    let result: TurboResult;
    let summary: RunSummary;

    beforeAll(async () => {
      const leaf = leafPackage(fixture().manifest);

      await replaceBuild(join(fixture().dir, leaf.path), FAILING_BUILD);
      result = await runTurbo(['run', 'build', '--summarize'], fixture().dir);
      summary = runSummarySchema.parse(await readOnlyRunSummary(fixture().dir));
    });

    it('THEN turbo exits non-zero', () => {
      expect(result.exitCode).not.toBe(0);
    });

    it('THEN the run summary passes runSummarySchema with a non-zero exit code', () => {
      expect(summary.execution.exitCode).not.toBe(0);
    });

    it('THEN the leaf build task reports a non-zero exit code', () => {
      const leafBuild = `${leafPackage(fixture().manifest).name}#build`;

      const exitCodes = summary.tasks.filter((task) => task.taskId === leafBuild).map((task) => task.execution.exitCode);

      expect(exitCodes).toHaveLength(1);
      expect(exitCodes).not.toContain(0);
    });
  });

  describe('GIVEN a target-like fixture whose leaf build hangs', () => {
    const fixture = fixtureHook(TARGET_LIKE);

    it('WHEN the leaf builds with a 2 s timeout THEN runTurbo rejects with an AbortError within a few seconds', async () => {
      const leaf = leafPackage(fixture().manifest);
      const leafDir = join(fixture().dir, leaf.path);

      await replaceBuild(leafDir, HANGING_BUILD);

      const startedAt = performance.now();
      const run = runTurbo(['run', 'build', `--filter=${leaf.name}`], fixture().dir, TIMEOUT_MS);

      await expect(run).rejects.toMatchObject({ name: 'AbortError' });

      const elapsedMs = performance.now() - startedAt;
      const hangPid = Number(await readFile(join(leafDir, HANG_PID_FILE), 'utf8'));
      // runTurbo rejects as the abort fires, while turbo is still stopping the build; later tests must not race it.
      const hasHangExited = (): boolean => !isAlive(hangPid);

      await vi.waitUntil(hasHangExited, { timeout: 10_000, interval: 50 });
      expect(elapsedMs).toBeLessThan(10_000);
    });
  });
});
