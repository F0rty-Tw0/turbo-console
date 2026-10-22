import { describe, expect, it } from 'vitest';

import { folderIdOf, isPackageId } from './folder-id.util.ts';

describe('FEATURE: folderIdOf', () => {
  it.each([
    ['', '\u0001'],
    ['apps', '\u0001apps']
  ])('GIVEN the folder %j WHEN its id is built THEN it is %j', (folder, expected) => {
    const id = folderIdOf(folder);

    expect(id).toBe(expected);
  });

  it('GIVEN the root folder and a real folder named (root) WHEN ids are built THEN they differ', () => {
    const rootId = folderIdOf('');
    const realId = folderIdOf('(root)');

    expect(realId).not.toBe(rootId);
  });
});

describe('FEATURE: isPackageId', () => {
  it.each(['web', '@acme/ui', '__proto__', 'constructor', '\u0004x', ''])(
    'GIVEN the id %j WHEN checked THEN it is a package id',
    (id) => {
      const isPackage = isPackageId(id);

      expect(isPackage).toBe(true);
    }
  );

  it.each(['\u0000a>b', '\u0001apps', '\u0002apps', '\u0003a\u0000b'])(
    'GIVEN the id %j WHEN checked THEN it is not a package id',
    (id) => {
      const isPackage = isPackageId(id);

      expect(isPackage).toBe(false);
    }
  );
});
