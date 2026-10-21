import { describe, expect, it } from 'vitest';

import { packageNamesOf } from './graph-package.util.ts';
import { graphPackageOf } from '../test/utils/graph-model.spec.util.ts';

describe('FEATURE: graph package names', () => {
  it('GIVEN packages WHEN their names are read THEN the names come in the given order', () => {
    expect(packageNamesOf([graphPackageOf('b', 'p'), graphPackageOf('a', 'q')])).toStrictEqual(['b', 'a']);
  });

  it('GIVEN no packages WHEN their names are read THEN the list is empty', () => {
    expect(packageNamesOf([])).toStrictEqual([]);
  });
});
