import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { hasEdge, manifestFilesOf, packageNamesOf, packagesByName } from './graph-package.util.ts';
import { GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';
import { graphPackageOf } from '../test/utils/graph-model.spec.util.ts';

describe('FEATURE: graph package names', () => {
  it('GIVEN packages WHEN their names are read THEN the names come in the given order', () => {
    expect(packageNamesOf([graphPackageOf('b', 'p'), graphPackageOf('a', 'q')])).toStrictEqual(['b', 'a']);
  });

  it('GIVEN no packages WHEN their names are read THEN the list is empty', () => {
    expect(packageNamesOf([])).toStrictEqual([]);
  });
});

describe('FEATURE: manifest files of a package', () => {
  it('GIVEN a package in a folder WHEN its manifest is named THEN shown is under the root and absolute is the file', () => {
    const files = manifestFilesOf('/ws', graphPackageOf('web', 'apps/web'));

    expect(files).toStrictEqual({ shown: 'apps/web/package.json', absolute: join('/ws', 'apps', 'web', 'package.json') });
  });

  it('GIVEN the root package (path "") WHEN its manifest is named THEN shown is package.json', () => {
    const files = manifestFilesOf('/ws', graphPackageOf('r', ''));

    expect(files).toStrictEqual({ shown: 'package.json', absolute: join('/ws', 'package.json') });
  });
});

describe('FEATURE: graph packages by name', () => {
  it('GIVEN a graph WHEN its packages are keyed THEN each name gives its package', () => {
    const byName = packagesByName(GRAPH_STATE_STUB);

    expect(byName.get('web')).toBe(GRAPH_STATE_STUB.packages.find((pkg) => pkg.name === 'web'));
    expect(byName.size).toBe(GRAPH_STATE_STUB.packages.length);
  });

  it('GIVEN a name no package has WHEN it is looked up THEN it is undefined', () => {
    expect(packagesByName(GRAPH_STATE_STUB).get('ghost')).toBeUndefined();
  });
});

describe('FEATURE: edge lookup', () => {
  const edges = [{ source: 'web', target: 'a' }];

  it('GIVEN a listed edge WHEN it is asked THEN it is true', () => {
    expect(hasEdge(edges, 'web', 'a')).toBe(true);
  });

  it('GIVEN the reverse of a listed edge WHEN it is asked THEN it is false', () => {
    expect(hasEdge(edges, 'a', 'web')).toBe(false);
  });
});
