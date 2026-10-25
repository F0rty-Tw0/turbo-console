import { describe, expect, it } from 'vitest';

import { atomSpecOf } from './atom-spec.util.ts';
import type { GraphAtomFile, GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';

const SIZE: NodeSize = { width: 200, height: 48 };

const fileOf = (id: string): GraphAtomFile => {
  const file: GraphAtomFile = { id, specPath: 'a.spec.ts', isLive: false };

  return file;
};

const GROUP: GraphAtomGroup = { umbrellaId: 'app#e2e', files: [fileOf('app#e2e--a'), fileOf('app#e2e--b')] };

const PLACEMENT: AtomPlacement = {
  shown: new Set(['app#e2e']),
  base: {},
  sizes: new Map([['app#e2e', SIZE]]),
  pkgBoxes: new Map([['app#e2e', 'pkg:app']])
};

const withGroupFiles = (...ids: string[]): GraphAtomGroup => {
  const group: GraphAtomGroup = { ...GROUP, files: ids.map(fileOf) };

  return group;
};

describe('FEATURE: atomSpecOf', () => {
  it('GIVEN a shown, sized, boxed umbrella with files WHEN read THEN the spec names its size and file ids', () => {
    expect(atomSpecOf(GROUP, PLACEMENT, {})).toStrictEqual({
      umbrellaId: 'app#e2e',
      umbrellaSize: SIZE,
      fileIds: ['app#e2e--a', 'app#e2e--b'],
      files: GROUP.files,
      hidden: 0
    });
  });

  it.each([
    ['not shown', { ...PLACEMENT, shown: new Set<string>() }],
    ['not sized', { ...PLACEMENT, sizes: new Map<string, NodeSize>() }],
    ['in no package box', { ...PLACEMENT, pkgBoxes: new Map<string, string>() }]
  ])('GIVEN an umbrella that is %s WHEN read THEN it has no spec', (_name, placement) => {
    expect(atomSpecOf(GROUP, placement, {})).toBeNull();
  });

  it('GIVEN a group of no files WHEN read THEN it has no spec', () => {
    expect(atomSpecOf(withGroupFiles(), PLACEMENT, {})).toBeNull();
  });

  it('GIVEN a file with the id of a task WHEN read THEN the spec leaves that file out', () => {
    const pkgBoxes = new Map([...PLACEMENT.pkgBoxes, ['app#build', 'pkg:app']]);
    const group = withGroupFiles('app#build', 'app#e2e--b');

    expect(atomSpecOf(group, { ...PLACEMENT, pkgBoxes }, {})?.fileIds).toStrictEqual(['app#e2e--b']);
  });

  it('GIVEN a group whose every file has the id of a task WHEN read THEN it has no spec', () => {
    const pkgBoxes = new Map([...PLACEMENT.pkgBoxes, ['app#build', 'pkg:app']]);

    expect(atomSpecOf(withGroupFiles('app#build'), { ...PLACEMENT, pkgBoxes }, {})).toBeNull();
  });
});
