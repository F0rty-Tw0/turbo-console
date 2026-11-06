import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { importFileOf } from './import-file.util.ts';
import { IMPORT_ROOT } from '../test/common/import-edge.const.ts';

const PACKAGE_PATH = 'packages/a';

const A = join(IMPORT_ROOT, 'packages', 'a');

describe('FEATURE: import file path rules', () => {
  it.each([
    ['src/a.ts', join(A, 'src', 'a.ts')],
    ['a.tsx', join(A, 'a.tsx')],
    ['a.mts', join(A, 'a.mts')],
    ['a.cts', join(A, 'a.cts')],
    ['a.js', join(A, 'a.js')],
    ['a.jsx', join(A, 'a.jsx')],
    ['a.mjs', join(A, 'a.mjs')],
    ['a.cjs', join(A, 'a.cjs')],
    ['./src/a.ts', join(A, 'src', 'a.ts')],
    ['src/..x.ts', join(A, 'src', '..x.ts')]
  ])('GIVEN %j WHEN checked THEN it opens %s', (file, expected) => {
    const absolute = importFileOf(IMPORT_ROOT, PACKAGE_PATH, file);

    expect(absolute).toBe(expected);
  });

  it('GIVEN the root package (packagePath "") and src/a.ts WHEN checked THEN it is join(ROOT, "src", "a.ts")', () => {
    const absolute = importFileOf(IMPORT_ROOT, '', 'src/a.ts');

    expect(absolute).toBe(join(IMPORT_ROOT, 'src', 'a.ts'));
  });

  it.each([
    [''],
    ['src/a.d.ts'],
    ['src/a.d.mts'],
    ['src/a.json'],
    ['src/a.TS'],
    ['../b/x.ts'],
    ['src/../../b/x.ts'],
    ['src/..'],
    ['src/../a.ts'],
    ['node_modules/x/i.ts'],
    ['src/node_modules/x.ts'],
    ['/ws/packages/a/src/a.ts'],
    ['C:/x.ts'],
    ['src\\a.ts']
  ])('GIVEN %j WHEN checked THEN it is null', (file) => {
    const absolute = importFileOf(IMPORT_ROOT, PACKAGE_PATH, file);

    expect(absolute).toBeNull();
  });
});
