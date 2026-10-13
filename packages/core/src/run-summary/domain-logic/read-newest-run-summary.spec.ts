import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readNewestRunSummary } from './read-newest-run-summary.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { MAX_SUMMARY_TRIES } from '../common/run-summary.const.ts';
import { newRunsRoot, runsDirOf, summaryText, writeRun } from '../test/utils/run-summary.spec.util.ts';

/** chmod has no effect on Windows, and root reads any directory. */
const CAN_DENY_READ = process.platform !== 'win32' && process.getuid?.() !== 0;

/** mkfifo, and symlinks without extra privileges, are POSIX only. */
const IS_POSIX = process.platform !== 'win32';

/** Seconds since the epoch; turbo writes summaries one run apart, so 10 s is a clear gap. */
const OLDER = 1_760_000_000;

const NEWER = OLDER + 10;

/** 2100-01-01 in seconds since the epoch: far past now. */
const FUTURE = 4_102_444_800;

let tempDir = '';

let caseCount = 0;

/** A fresh workspace root with an empty `.turbo/runs`. */
const newRoot = async (): Promise<string> => {
  caseCount += 1;

  return newRunsRoot(tempDir, `case ${caseCount}`);
};

/** A valid summary with `id` in a directory beside the case roots, outside every one of them. */
const outsideSummary = async (id: string): Promise<string> => {
  const dir = join(tempDir, `outside ${id}`);
  const path = join(dir, 'outside.json');

  await mkdir(dir);
  await writeFile(path, summaryText(id));

  return path;
};

describe('FEATURE: newest run summary', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'run-summary-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a root with no .turbo/runs', () => {
    it('WHEN read THEN it is null', async () => {
      const root = join(tempDir, 'no runs');

      await mkdir(root);

      await expect(readNewestRunSummary(root)).resolves.toBeNull();
    });
  });

  describe('GIVEN a root whose .turbo is a file', () => {
    it('WHEN read THEN there is no runs directory, so it is null', async () => {
      const root = join(tempDir, 'turbo file');

      await mkdir(root);
      await writeFile(join(root, '.turbo'), '');

      await expect(readNewestRunSummary(root)).resolves.toBeNull();
    });
  });

  describe('GIVEN a root whose .turbo/runs is a file', () => {
    it('WHEN read THEN there is no runs directory, so it is null', async () => {
      const root = join(tempDir, 'runs file');

      await mkdir(join(root, '.turbo'), { recursive: true });
      await writeFile(runsDirOf(root), '');

      await expect(readNewestRunSummary(root)).resolves.toBeNull();
    });
  });

  describe('GIVEN two valid summaries written 10 s apart', () => {
    it('WHEN read THEN it is the newer one', async () => {
      const root = await newRoot();

      await writeRun(root, 'z.json', summaryText('older'), OLDER);
      await writeRun(root, 'a.json', summaryText('newer'), NEWER);

      await expect(readNewestRunSummary(root)).resolves.toMatchObject({ id: 'newer' });
    });
  });

  describe(`GIVEN ${MAX_SUMMARY_TRIES} valid summaries dated 2100 and one real summary`, () => {
    it('WHEN read THEN the future-dated files are left out, so it is the real one', async () => {
      const root = await newRoot();
      const futureTimes = Array.from({ length: MAX_SUMMARY_TRIES }, (_, index) => FUTURE + index);

      await writeRun(root, 'real.json', summaryText('real'), OLDER);

      for (const seconds of futureTimes) await writeRun(root, `future-${seconds}.json`, summaryText('future'), seconds);

      await expect(readNewestRunSummary(root)).resolves.toMatchObject({ id: 'real' });
    });
  });

  describe('GIVEN two valid summaries with the same mtime', () => {
    it('WHEN read THEN it is the one with the larger name', async () => {
      const root = await newRoot();

      await writeRun(root, 'b.json', summaryText('larger'), NEWER);
      await writeRun(root, 'a.json', summaryText('smaller'), NEWER);

      await expect(readNewestRunSummary(root)).resolves.toMatchObject({ id: 'larger' });
    });
  });

  describe('GIVEN the newest summary is still being written', () => {
    it('WHEN read THEN it is the older valid one', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', summaryText('older'), OLDER);
      await writeRun(root, 'b.json', '{', NEWER);

      await expect(readNewestRunSummary(root)).resolves.toMatchObject({ id: 'older' });
    });
  });

  describe('GIVEN only summaries that fail to parse or break the schema', () => {
    it('WHEN read THEN it is null', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', '{', OLDER);
      await writeRun(root, 'b.json', '{"id":"no-tasks"}', NEWER);

      await expect(readNewestRunSummary(root)).resolves.toBeNull();
    });
  });

  describe('GIVEN a newer valid summary in a file not ending .json', () => {
    it('WHEN read THEN that file is ignored', async () => {
      const root = await newRoot();

      await writeRun(root, 'a.json', summaryText('json'), OLDER);
      await writeRun(root, 'b.json.tmp', summaryText('temp'), NEWER);

      await expect(readNewestRunSummary(root)).resolves.toMatchObject({ id: 'json' });
    });
  });

  describe.skipIf(!IS_POSIX)('GIVEN a newer FIFO named like a summary', () => {
    it('WHEN read THEN it is skipped for the older valid file instead of blocking on the read', async () => {
      const root = await newRoot();
      const fifo = join(runsDirOf(root), 'b.json');

      await writeRun(root, 'a.json', summaryText('file'), OLDER);
      execFileSync('mkfifo', [fifo]);
      await utimes(fifo, NEWER, NEWER);

      await expect(readNewestRunSummary(root)).resolves.toMatchObject({ id: 'file' });
    });
  });

  describe.skipIf(!IS_POSIX)('GIVEN a newer summary symlinked to a valid one outside the root', () => {
    it('WHEN read THEN the symlink is ignored for the older valid file', async () => {
      const root = await newRoot();
      const link = join(runsDirOf(root), 'b.json');

      await writeRun(root, 'a.json', summaryText('inside'), OLDER);
      await symlink(await outsideSummary('linked file'), link);

      await expect(readNewestRunSummary(root)).resolves.toMatchObject({ id: 'inside' });
    });
  });

  describe.skipIf(!IS_POSIX)('GIVEN a .turbo/runs symlinked to a directory outside the root', () => {
    it('WHEN read THEN there is no runs directory, so it is null', async () => {
      const root = join(tempDir, 'linked runs');
      const outside = await outsideSummary('linked dir');

      await mkdir(join(root, '.turbo'), { recursive: true });
      await symlink(join(outside, '..'), runsDirOf(root));

      await expect(readNewestRunSummary(root)).resolves.toBeNull();
    });
  });

  describe.skipIf(!CAN_DENY_READ)('GIVEN a .turbo that cannot be searched', () => {
    it('WHEN read THEN the realpath fails, and it rejects io naming the runs directory and EACCES', async () => {
      const root = await newRoot();
      const dotTurbo = join(root, '.turbo');
      const expected = { kind: 'io', message: `${runsDirOf(root)}: EACCES` };

      await chmod(dotTurbo, 0o000);

      try {
        const reading = readNewestRunSummary(root);

        await expect(reading).rejects.toBeInstanceOf(TurboException);
        await expect(reading).rejects.toMatchObject(expected);
      } finally {
        await chmod(dotTurbo, 0o700);
      }
    });
  });

  describe.skipIf(!CAN_DENY_READ)('GIVEN a .turbo/runs that cannot be read', () => {
    it('WHEN read THEN it rejects io naming the directory and EACCES', async () => {
      const root = await newRoot();
      const runs = runsDirOf(root);
      const expected = { kind: 'io', message: `${runs}: EACCES` };

      await chmod(runs, 0o000);

      try {
        const reading = readNewestRunSummary(root);

        await expect(reading).rejects.toBeInstanceOf(TurboException);
        await expect(reading).rejects.toMatchObject(expected);
      } finally {
        await chmod(runs, 0o700);
      }
    });
  });

  describe.skipIf(!CAN_DENY_READ)('GIVEN a .turbo/runs that can be listed but not searched', () => {
    it('WHEN read THEN the stat fails, and it rejects io naming the file and EACCES', async () => {
      const root = await newRoot();
      const runs = runsDirOf(root);
      const expected = { kind: 'io', message: `${join(runs, 'a.json')}: EACCES` };

      await writeRun(root, 'a.json', summaryText('unsearchable'), OLDER);
      await chmod(runs, 0o444);

      try {
        const reading = readNewestRunSummary(root);

        await expect(reading).rejects.toBeInstanceOf(TurboException);
        await expect(reading).rejects.toMatchObject(expected);
      } finally {
        await chmod(runs, 0o700);
      }
    });
  });
});
