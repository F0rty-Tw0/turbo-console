import type { GraphPackage } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { packageNamesOf } from './graph-package.util.ts';

const infoOf = (name: string, path: string): GraphPackage => {
  const info: GraphPackage = { name, path, tags: [] };

  return info;
};

describe('FEATURE: graph package names', () => {
  it('GIVEN packages WHEN their names are read THEN the names come in the given order', () => {
    expect(packageNamesOf([infoOf('b', 'p'), infoOf('a', 'q')])).toStrictEqual(['b', 'a']);
  });

  it('GIVEN no packages WHEN their names are read THEN the list is empty', () => {
    expect(packageNamesOf([])).toStrictEqual([]);
  });
});
