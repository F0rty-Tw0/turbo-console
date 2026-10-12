import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { checkCwd } from './check-cwd.ts';
import { toTurboException } from '../../errors/utils/turbo-error.util.ts';

/** chmod has no effect on Windows, and root searches any directory. */
const CAN_DENY_SEARCH = process.platform !== 'win32' && process.getuid?.() !== 0;

let tempDir = '';

const tempPath = (name: string): string => join(tempDir, name);

const rejectionOf = async (cwd: string): Promise<unknown> => checkCwd(cwd, AbortSignal.timeout(5000)).catch((error: unknown) => error);

describe('FEATURE: cwd check before the turbo spawn', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'check-cwd-'));
    await writeFile(tempPath('turbo.sh'), '#!/bin/sh\n', { mode: 0o755 });
    await mkdir(tempPath('locked'), { mode: 0o600 });
  });

  afterAll(async () => {
    await chmod(tempPath('locked'), 0o700);
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a searchable directory', () => {
    it('WHEN checked THEN it resolves', async () => {
      await expect(checkCwd(tempDir, AbortSignal.timeout(5000))).resolves.toBeUndefined();
    });
  });

  describe('GIVEN an executable regular file', () => {
    let error: unknown;

    beforeAll(async () => {
      error = await rejectionOf(tempPath('turbo.sh'));
    });

    it('WHEN checked THEN it rejects with an ENOTDIR naming the file', () => {
      expect(error).toMatchObject({ code: 'ENOTDIR', path: tempPath('turbo.sh') });
    });

    it('WHEN the rejection is converted THEN it is io naming the file, not not-found', () => {
      const exception = toTurboException(error, 'query');

      expect(exception).toMatchObject({ kind: 'io', message: `${tempPath('turbo.sh')}: ENOTDIR` });
    });
  });

  describe.skipIf(!CAN_DENY_SEARCH)('GIVEN a directory without search permission', () => {
    it('WHEN checked THEN it rejects with an EACCES naming it', async () => {
      const error = await rejectionOf(tempPath('locked'));

      expect(error).toMatchObject({ code: 'EACCES', path: tempPath('locked') });
    });
  });

  describe('GIVEN a cwd that does not exist', () => {
    it('WHEN checked THEN it rejects with an ENOENT naming it', async () => {
      const error = await rejectionOf(tempPath('missing'));

      expect(error).toMatchObject({ code: 'ENOENT', path: tempPath('missing') });
    });

    it('WHEN the signal aborts while the check is in flight THEN it resolves, leaving the abort to the caller', async () => {
      const controller = new AbortController();

      const check = checkCwd(tempPath('missing'), controller.signal);

      controller.abort();

      await expect(check).resolves.toBeUndefined();
    });
  });
});
