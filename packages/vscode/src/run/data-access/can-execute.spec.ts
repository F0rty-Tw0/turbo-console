import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { canExecute } from './can-execute.ts';

const isWindows = process.platform === 'win32';

describe('FEATURE: whether the turbo binary can run', () => {
  let parent = '';

  beforeAll(async () => {
    parent = await mkdtemp(join(tmpdir(), 'can-execute-'));

    await writeFile(join(parent, 'turbo'), '', { mode: 0o755 });
    await writeFile(join(parent, 'plain'), '', { mode: 0o644 });
  });

  afterAll(async () => {
    await rm(parent, { recursive: true, force: true, maxRetries: 5 });
  });

  it('GIVEN an executable file WHEN it is checked THEN it can run', async () => {
    const isRunnable = await canExecute(join(parent, 'turbo'));

    expect(isRunnable).toBe(true);
  });

  it('GIVEN no file at the path WHEN it is checked THEN it cannot run', async () => {
    const isRunnable = await canExecute(join(parent, 'missing'));

    expect(isRunnable).toBe(false);
  });

  it.skipIf(isWindows)('GIVEN a file without the execute bit on POSIX WHEN it is checked THEN it cannot run', async () => {
    const isRunnable = await canExecute(join(parent, 'plain'));

    expect(isRunnable).toBe(false);
  });

  it.runIf(isWindows)('GIVEN any existing file on Windows WHEN it is checked THEN it can run', async () => {
    const isRunnable = await canExecute(join(parent, 'plain'));

    expect(isRunnable).toBe(true);
  });
});
