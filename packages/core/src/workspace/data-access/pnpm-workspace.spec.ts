import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { hasPnpmWorkspacePackages } from './pnpm-workspace.ts';
import type * as smallFile from '../../shared/fs/data-access/small-file.ts';
import { rootWithFiles } from '../test/utils/root-files.spec.util.ts';

const failing = vi.hoisted(() => {
  const state = { code: '' };

  return state;
});

vi.mock('../../shared/fs/data-access/small-file.ts', async (importOriginal) => {
  const original = await importOriginal<typeof smallFile>();
  const readSmallFile: typeof smallFile.readSmallFile = async (...args) => {
    if (failing.code === '') return original.readSmallFile(...args);

    throw Object.assign(new Error('x'), { code: failing.code });
  };
  const mocked = { ...original, readSmallFile };

  return mocked;
});

const writtenFiles = (text: string | null): Record<string, string> => {
  const none: Record<string, string> = {};
  const files: Record<string, string> = { 'pnpm-workspace.yaml': text ?? '' };

  if (text === null) return none;

  return files;
};

describe('FEATURE: pnpm-workspace.yaml declares workspace packages', () => {
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pnpm-workspace-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('GIVEN a root and the text of its pnpm-workspace.yaml (null: no file)', () => {
    it.each<[string, string | null, boolean]>([
      ['no file', null, false],
      ['an empty file', '', false],
      ['packages with one item', 'packages:\n  - "packages/*"\n', true],
      ['packages after another key', 'catalog:\n  a: 1\npackages:\n  - apps/*\n', true],
      ['a file without a packages key', 'onlyBuiltDependencies: []\n', false],
      ['comments and blank lines between key and item', '# c\n\npackages:\n  # c\n\n  - "a"\n', true],
      ['packages with no item', 'packages:\n', false],
      ['packages followed by another key', 'packages:\nother: 1\n', false],
      ['only a commented item', 'packages:\n  # - a\n', false],
      ['an item at the key indent (valid YAML)', 'packages:\n- a\n', true],
      ['CRLF line ends', 'packages:\r\n  - a\r\n', true],
      ['inline empty list', 'packages: []\n', false],
      ['inline blank list with a comment', 'packages: [ ] # none\n', false],
      ['inline list with an item', 'packages: ["a"]\n', true],
      ['inline list with an item and a comment', 'packages: ["a"] # c\n', true],
      ['a leading byte order mark', '\uFEFFpackages:\n  - a\n', true],
      ['a flow list over several lines', 'packages: [\n  "a"\n]\n', true],
      ['an unclosed flow list (read as declaring)', 'packages: [\n', true],
      ['an inline block scalar', 'packages: |\n  - a\n', false],
      ['a bare dash item', 'packages:\n  -\n', true],
      ['a nested packages key', 'x:\n  packages:\n    - a\n', false]
    ])('WHEN the file is %s THEN hasPnpmWorkspacePackages is %j', async (_, text, expected) => {
      const root = await rootWithFiles(tempDir, writtenFiles(text));

      await expect(hasPnpmWorkspacePackages(root)).resolves.toBe(expected);
    });
  });

  describe('GIVEN a signal already aborted', () => {
    it('WHEN read THEN it rejects with the raw AbortError', async () => {
      const root = await rootWithFiles(tempDir, { 'pnpm-workspace.yaml': 'packages:\n  - a\n' });
      const controller = new AbortController();

      controller.abort();

      await expect(hasPnpmWorkspacePackages(root, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    });
  });

  describe('GIVEN a read that fails other than missing', () => {
    it('WHEN read THEN it rejects io', async () => {
      const root = await rootWithFiles(tempDir, {});

      failing.code = 'EACCES';

      try {
        await expect(hasPnpmWorkspacePackages(root)).rejects.toMatchObject({ kind: 'io' });
      } finally {
        failing.code = '';
      }
    });
  });
});
