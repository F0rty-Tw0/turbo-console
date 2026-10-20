import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readRunSummaryFile } from './run-summary-files.ts';
import { RUN_SUMMARY_STUB } from '../test/stubs/run-summary.stub.ts';
import { newRunsRoot, runsDirOf, summaryText, taskEntry } from '../test/utils/run-summary.spec.util.ts';

/** Symlinks without extra privileges are POSIX only. */
const IS_POSIX = process.platform !== 'win32';

const SUMMARY_ID = 'summary';

const SPAN = { startTime: 1_760_000_000_000, endTime: 1_760_000_004_000 };

let tempDir = '';

let root = '';

const writeSummary = async (name: string, summary: object): Promise<void> => {
  await writeFile(join(runsDirOf(root), name), JSON.stringify(summary));
};

describe('FEATURE: run summary file reading', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'run-summary-files-'));
    root = await newRunsRoot(tempDir, 'root');

    await writeFile(join(runsDirOf(root), 'real.json'), summaryText(SUMMARY_ID));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a regular summary file', () => {
    it('WHEN read THEN it is the parsed summary', async () => {
      await expect(readRunSummaryFile(root, 'real.json')).resolves.toStrictEqual({ ...RUN_SUMMARY_STUB, id: SUMMARY_ID });
    });
  });

  describe('GIVEN a single-package summary (monorepo false, bare taskId)', () => {
    it('WHEN read THEN every taskId reads //#task and the rest is as written', async () => {
      const tasks = [taskEntry('build', SPAN, 'MISS'), taskEntry('lint', SPAN, 'HIT')];

      await writeSummary('single.json', { ...RUN_SUMMARY_STUB, monorepo: false, tasks });

      const summary = await readRunSummaryFile(root, 'single.json');

      expect(summary?.tasks.map((task) => task.taskId)).toStrictEqual(['//#build', '//#lint']);
      expect(summary).toMatchObject({ monorepo: false, execution: RUN_SUMMARY_STUB.execution });
    });
  });

  describe('GIVEN a monorepo summary', () => {
    it('WHEN read THEN its qualified taskIds are not rewritten', async () => {
      await writeSummary('mono.json', { ...RUN_SUMMARY_STUB, tasks: [taskEntry('web#build', SPAN, 'MISS')] });

      const summary = await readRunSummaryFile(root, 'mono.json');

      expect(summary?.tasks.map((task) => task.taskId)).toStrictEqual(['web#build']);
    });
  });

  describe('GIVEN a summary with no monorepo key (a turbo outside the supported range)', () => {
    it('WHEN read THEN it is null', async () => {
      const { id, execution, tasks } = RUN_SUMMARY_STUB;

      await writeSummary('old.json', { id, execution, tasks });

      await expect(readRunSummaryFile(root, 'old.json')).resolves.toBeNull();
    });
  });

  describe('GIVEN a name that is a symlink to a valid summary', () => {
    it.skipIf(!IS_POSIX)('WHEN read THEN the open does not follow it, so it is null', async () => {
      await symlink(join(runsDirOf(root), 'real.json'), join(runsDirOf(root), 'link.json'));

      await expect(readRunSummaryFile(root, 'link.json')).resolves.toBeNull();
    });
  });
});
