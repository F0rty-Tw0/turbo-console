import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readRunSummaryFile } from './run-summary-files.ts';
import { RUN_SUMMARY_STUB } from '../test/stubs/run-summary.stub.ts';
import { newRunsRoot, runsDirOf, summaryText } from '../test/utils/run-summary.spec.util.ts';

/** Symlinks without extra privileges are POSIX only. */
const IS_POSIX = process.platform !== 'win32';

const SUMMARY_ID = 'summary';

let tempDir = '';

let root = '';

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

  describe('GIVEN a name that is a symlink to a valid summary', () => {
    it.skipIf(!IS_POSIX)('WHEN read THEN the open does not follow it, so it is null', async () => {
      await symlink(join(runsDirOf(root), 'real.json'), join(runsDirOf(root), 'link.json'));

      await expect(readRunSummaryFile(root, 'link.json')).resolves.toBeNull();
    });
  });
});
