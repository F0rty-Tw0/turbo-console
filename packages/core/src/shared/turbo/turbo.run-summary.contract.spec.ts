import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import { beforeAll, describe, expect, it } from 'vitest';

import { runSummarySchema } from './common/run-summary.schema.ts';
import type { RunSummary, TurboResult } from './common/turbo.type.ts';
import { runTurbo } from './data-access/run-turbo.ts';
import { fixtureHook } from './test/utils/fixture-hook.spec.util.ts';
import { leafPackage } from './test/utils/manifest.spec.util.ts';
import { optionalKeyPaths } from './test/utils/schema-strictness.spec.util.ts';

const TARGET_LIKE = PRESETS['target-like'];

const PASSING_BUILD = '"build": "node -e 0"';

const FAILING_BUILD = `"build": ${JSON.stringify('node -e "process.exit(3)"')}`;

/** The JSON of the one run summary in `dir`; throws unless exactly one exists, so a stale summary cannot be read. */
const readOnlyRunSummary = async (dir: string): Promise<unknown> => {
  const runsDir = join(dir, '.turbo', 'runs');
  const files = await readdir(runsDir);

  if (files.length !== 1) throw new Error(`expected one run summary, found ${files.length}`);

  const text = await readFile(join(runsDir, files.join('')), 'utf8');
  const json: unknown = JSON.parse(text);

  return json;
};

/** Rewrites the package's `build` script so it exits 3. */
const failBuild = async (packageDir: string): Promise<void> => {
  const manifestFile = join(packageDir, 'package.json');
  const text = await readFile(manifestFile, 'utf8');

  const hasPassingBuild = text.includes(PASSING_BUILD);

  if (!hasPassingBuild) throw new Error(`no ${PASSING_BUILD} in ${manifestFile}`);

  await writeFile(manifestFile, text.replace(PASSING_BUILD, FAILING_BUILD));
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

      await failBuild(join(fixture().dir, leaf.path));
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
});
