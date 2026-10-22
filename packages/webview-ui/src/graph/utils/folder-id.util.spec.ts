import { describe, expect, it } from 'vitest';

import { collapsedIdOf, folderIdOf, folderLinkIdOf, folderOfElementId, isPackageId } from './folder-id.util.ts';

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

describe('FEATURE: collapsedIdOf', () => {
  it.each([
    ['apps', '\u0002apps'],
    ['', '\u0002'],
    ['(root)', '\u0002(root)'],
    ['__proto__', '\u0002__proto__']
  ])('GIVEN the folder %j WHEN its collapsed id is built THEN it is %j', (folder, expected) => {
    const id = collapsedIdOf(folder);

    expect(id).toBe(expected);
  });

  it('GIVEN the root folder and a real folder named (root) WHEN all four ids are built THEN they are distinct', () => {
    const folders = ['', '(root)'];
    const ids = folders.flatMap((folder) => [folderIdOf(folder), collapsedIdOf(folder)]);

    expect(new Set(ids).size).toBe(4);
  });
});

describe('FEATURE: folderLinkIdOf', () => {
  it('GIVEN a folder id and a package WHEN the link id is built THEN prefix, source, NUL and target join', () => {
    const id = folderLinkIdOf('apps', '@acme/ui');

    expect(id).toBe('\u0003apps\u0000@acme/ui');
  });
});

describe('FEATURE: folderOfElementId', () => {
  it.each([
    ['\u0001apps', 'apps'],
    ['\u0002apps', 'apps'],
    ['\u0001', ''],
    ['apps', null],
    ['\u0003a\u0000b', null],
    ['\u0000["a","b"]', null],
    ['', null]
  ])('GIVEN the element id %j WHEN its folder is read THEN it is %j', (id, expected) => {
    const folder = folderOfElementId(id);

    expect(folder).toBe(expected);
  });
});
