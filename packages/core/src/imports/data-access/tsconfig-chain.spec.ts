import { mkdtemp, rm, symlink } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readTsconfigPaths } from './tsconfig-chain.ts';
import type { TsconfigPaths } from '../common/import-scan.type.ts';
import { writeImportTree } from '../test/utils/import-tree.spec.util.ts';
import { openedNamesOf } from '../test/utils/opened-names.spec.util.ts';

const reads = vi.hoisted(() => {
  const opened: string[] = [];
  const state = { opened };

  return state;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();

  /** Lists each opened path before the real open. */
  const open = async (...args: Parameters<typeof real.open>): Promise<fsPromises.FileHandle> => {
    reads.opened.push(String(args[0]));

    return real.open(...args);
  };

  const mocked = { ...real, open };

  return mocked;
});

/** What a row expects: `baseUrl` relative to the root dir (`''` is the root itself). */
type ExpectedPaths = {
  readonly baseUrl: string;
  readonly paths: Record<string, string[]>;
};

type ChainRow = {
  readonly label: string;
  readonly files: Record<string, string>;
  readonly then: string;
  readonly expected: ExpectedPaths | null;
};

type OpenRow = {
  readonly label: string;
  readonly files: Record<string, string>;
  readonly opened: string[];
};

const A_DIR = 'packages/a';

const A_CONFIG = `${A_DIR}/tsconfig.json`;

const TSCONFIG_MAX_BYTES = 1024 * 1024;

const P: Record<string, string[]> = { '@b/*': ['packages/b/src/*'] };

const P1: Record<string, string[]> = { '@one/*': ['one/*'] };

const P2: Record<string, string[]> = { '@two/*': ['two/*'] };

const extendsOf = (entries: string[]): string => `"extends": ${JSON.stringify(entries)}`;

const pathsPart = (paths: Record<string, string[]>): string => `"compilerOptions": { "paths": ${JSON.stringify(paths)} }`;

const configOf = (...parts: string[]): string => `{ ${parts.join(', ')} }`;

const nameOf = (index: number): string => {
  if (index === 0) return A_CONFIG;

  return `${A_DIR}/t${index}.json`;
};

const configAt = (index: number, length: number): string => {
  const isLast = index === length - 1;

  if (isLast) return configOf(pathsPart(P));

  return configOf(extendsOf([`./t${index + 1}.json`]));
};

/** `t0` is A's tsconfig.json, `t(i)` extends `t(i+1)`, and only the last file of `length` sets `P`. */
const chainOf = (length: number): Record<string, string> => {
  const files: Record<string, string> = {};

  for (let index = 0; index < length; index++) {
    files[nameOf(index)] = configAt(index, length);
  }

  return files;
};

const pathsAt = (baseUrl: string, paths: Record<string, string[]>): ExpectedPaths => {
  const expected: ExpectedPaths = { baseUrl, paths };

  return expected;
};

const rowOf = (label: string, then: string, files: Record<string, string>, expected: ExpectedPaths | null): ChainRow => {
  const row: ChainRow = { label, files, then, expected };

  return row;
};

const openRowOf = (label: string, files: Record<string, string>, opened: string[]): OpenRow => {
  const row: OpenRow = { label, files, opened };

  return row;
};

const BIG_CONFIG = `${configOf(pathsPart(P))}${' '.repeat(TSCONFIG_MAX_BYTES)}`;

const MUTUAL_FILES: Record<string, string> = {
  [A_CONFIG]: configOf(extendsOf(['./a.json'])),
  [`${A_DIR}/a.json`]: configOf(extendsOf(['./b.json'])),
  [`${A_DIR}/b.json`]: configOf(extendsOf(['./a.json']), pathsPart(P))
};

const ABOVE_ROOT_FILES: Record<string, string> = {
  [A_CONFIG]: configOf(extendsOf(['../../../base.json'])),
  '../base.json': configOf(pathsPart(P))
};

const chainRows: ChainRow[] = [
  rowOf('A has no tsconfig.json', 'there are none', { [`${A_DIR}/x.ts`]: '' }, null),
  rowOf('A sets paths', 'the paths and the dir of A are read', { [A_CONFIG]: configOf(pathsPart(P)) }, pathsAt(A_DIR, P)),
  rowOf(
    'A extends a root base that sets baseUrl and paths',
    'the paths are read against the root',
    {
      [A_CONFIG]: configOf(extendsOf(['../../tsconfig.base.json'])),
      'tsconfig.base.json': configOf('"compilerOptions": { "baseUrl": ".", "paths": { "@b/*": ["packages/b/src/*"] } }')
    },
    pathsAt('', P)
  ),
  rowOf(
    'A extends two files that both set paths',
    'the later entry wins',
    {
      [A_CONFIG]: configOf(extendsOf(['./a.json', './b.json'])),
      [`${A_DIR}/a.json`]: configOf(pathsPart(P1)),
      [`${A_DIR}/b.json`]: configOf(pathsPart(P2))
    },
    pathsAt(A_DIR, P2)
  ),
  rowOf(
    'A extends ./base and only base.json exists',
    'the .json file is read',
    { [A_CONFIG]: configOf(extendsOf(['./base'])), [`${A_DIR}/base.json`]: configOf(pathsPart(P)) },
    pathsAt(A_DIR, P)
  ),
  rowOf(
    'A and its base both set paths',
    'the paths of A win',
    { [A_CONFIG]: configOf(extendsOf(['./base.json']), pathsPart(P1)), [`${A_DIR}/base.json`]: configOf(pathsPart(P2)) },
    pathsAt(A_DIR, P1)
  ),
  rowOf('only the 8th file of a chain sets paths', 'its paths are read', chainOf(8), pathsAt(A_DIR, P)),
  rowOf('only the 9th file of a chain sets paths', 'there are none', chainOf(9), null),
  rowOf('two files extend each other and one sets paths', 'the paths are read', MUTUAL_FILES, pathsAt(A_DIR, P)),
  rowOf('a base above the root', 'there are none', ABOVE_ROOT_FILES, null),
  rowOf(
    'A sets paths and extends a package',
    'the paths of A are read',
    { [A_CONFIG]: configOf(extendsOf(['@company/tsconfig/base.json']), pathsPart(P)) },
    pathsAt(A_DIR, P)
  ),
  rowOf(
    'a missing entry comes after the file that sets paths',
    'the paths are read',
    { [A_CONFIG]: configOf(extendsOf(['./base.json', './missing.json'])), [`${A_DIR}/base.json`]: configOf(pathsPart(P)) },
    pathsAt(A_DIR, P)
  ),
  rowOf(
    'the base has a JSONC error',
    'there are none',
    { [A_CONFIG]: configOf(extendsOf(['./base.json'])), [`${A_DIR}/base.json`]: '{ "compilerOptions": }' },
    null
  ),
  rowOf('tsconfig.json is a directory', 'there are none', { [`${A_CONFIG}/`]: '' }, null),
  rowOf('tsconfig.json is over 1 MiB', 'there are none', { [A_CONFIG]: BIG_CONFIG }, null)
];

const openRows: OpenRow[] = [
  openRowOf('A has no tsconfig.json', { [`${A_DIR}/x.ts`]: '' }, []),
  openRowOf('a chain of 9 files', chainOf(9), Object.keys(chainOf(8))),
  openRowOf('two files extend each other', MUTUAL_FILES, [A_CONFIG, `${A_DIR}/a.json`, `${A_DIR}/b.json`]),
  openRowOf('a base above the root', ABOVE_ROOT_FILES, [A_CONFIG])
];

describe('FEATURE: read the tsconfig paths of a package', () => {
  let tmp = '';
  let root = '';
  let aDir = '';

  const expectedOf = (expected: ExpectedPaths | null): TsconfigPaths | null => {
    if (expected === null) return null;

    const effective: TsconfigPaths = { baseUrl: join(root, expected.baseUrl), paths: expected.paths };

    return effective;
  };

  const openedNames = (): string[] => {
    const names = openedNamesOf(reads.opened, root);

    return names.map((name) => name.replaceAll('\\', '/'));
  };

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'tsconfig-chain-'));
    root = join(tmp, 'ws');
    aDir = join(root, A_DIR);
    reads.opened.length = 0;
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  describe('GIVEN a tree of tsconfig files under the root', () => {
    it.each(chainRows)('WHEN $label THEN $then', async ({ files, expected }) => {
      await writeImportTree(root, files);

      const effective = await readTsconfigPaths(aDir, root);

      expect(effective).toStrictEqual(expectedOf(expected));
    });

    it.each(openRows)('WHEN $label THEN only the expected files are opened, each once', async ({ files, opened }) => {
      await writeImportTree(root, files);

      await readTsconfigPaths(aDir, root);

      expect(openedNames()).toStrictEqual(opened);
    });
  });

  describe('GIVEN tsconfig.json is a symlink to a valid config', () => {
    const CAN_SYMLINK = process.platform !== 'win32';

    beforeEach(async () => {
      if (!CAN_SYMLINK) return;

      await writeImportTree(root, { 'real.json': configOf(pathsPart(P)), [`${A_DIR}/x.ts`]: '' });
      await symlink(join(root, 'real.json'), join(aDir, 'tsconfig.json'));
    });

    it.skipIf(!CAN_SYMLINK)('WHEN read THEN there are none', async () => {
      const effective = await readTsconfigPaths(aDir, root);

      expect(effective).toBeNull();
    });

    it.skipIf(!CAN_SYMLINK)('WHEN read THEN the link is never opened', async () => {
      await readTsconfigPaths(aDir, root);

      expect(reads.opened).toStrictEqual([]);
    });
  });
});
