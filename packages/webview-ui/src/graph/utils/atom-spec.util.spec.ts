import { describe, expect, it } from 'vitest';

import { atomSpecOf, moreIdOf, outcomesOf } from './atom-spec.util.ts';
import type { GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomFile, GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { fileOf } from '../test/utils/atom-file.spec.util.ts';

const SIZE: NodeSize = { width: 200, height: 48 };

const GROUP: GraphAtomGroup = { umbrellaId: 'app#e2e', files: [fileOf('app#e2e--a'), fileOf('app#e2e--b')] };

const PLACEMENT: AtomPlacement = {
  shown: new Set(['app#e2e']),
  base: {},
  sizes: new Map([['app#e2e', SIZE]]),
  pkgBoxes: new Map([['app#e2e', 'pkg:app']])
};

const withGroupFiles = (...ids: string[]): GraphAtomGroup => {
  const group: GraphAtomGroup = { ...GROUP, files: ids.map((id) => fileOf(id)) };

  return group;
};

const MORE_ID = 'atom-more:app#e2e';

const idOf = (number: number): string => `app#e2e--f${String(number).padStart(2, '0')}`;

const rangeIds = (from: number, to: number): string[] => {
  const numbers = Array.from({ length: to - from + 1 }, (_value, index) => from + index);

  return numbers.map(idOf);
};

const filesOf = (count: number): GraphAtomFile[] => rangeIds(1, count).map((id) => fileOf(id));

const failedOf = (from: number, to: number): Record<string, GraphAtomOutcome> => {
  const ids = rangeIds(from, to);
  const entries = ids.map((id): [string, GraphAtomOutcome] => [id, 'failed']);

  return Object.fromEntries(entries);
};

const specOf = (
  files: GraphAtomFile[],
  outcomes: Record<string, GraphAtomOutcome>,
  placement: AtomPlacement = PLACEMENT
): AtomDrawSpec => {
  const group: GraphAtomGroup = { umbrellaId: 'app#e2e', files };
  const spec = atomSpecOf(group, placement, outcomes);

  if (spec === null) throw new Error('the group has a free file, so it has a spec');

  return spec;
};

const idsOf = (spec: AtomDrawSpec): string[] => spec.files.map((file) => file.id);

const FIRST_TEN = rangeIds(1, 10);

const FIRST_TEN_AND_MORE = [...FIRST_TEN, MORE_ID];

/** The two failed files first, then the earliest of the rest. */
const FIRST_EIGHT = rangeIds(1, 8);

const FAILED_FIRST = [idOf(15), idOf(30), ...FIRST_EIGHT];

const FAILED_FIRST_AND_MORE = [...FAILED_FIRST, MORE_ID];

describe('FEATURE: the atom spec util', () => {
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

  describe.each([10, 11])('GIVEN a group of %i free files', (count) => {
    it('WHEN read THEN every file is drawn', () => {
      const expected = rangeIds(1, count);

      const spec = specOf(filesOf(count), {});

      expect(idsOf(spec)).toStrictEqual(expected);
    });

    it('WHEN read THEN no file is hidden', () => {
      const spec = specOf(filesOf(count), {});

      expect(spec.hidden).toBe(0);
    });

    it('WHEN read THEN the grid holds the files and no count node', () => {
      const expected = rangeIds(1, count);

      const spec = specOf(filesOf(count), {});

      expect(spec.fileIds).toStrictEqual(expected);
    });
  });

  describe('GIVEN a group of 12 free files', () => {
    it('WHEN read THEN the first 10 are drawn', () => {
      const spec = specOf(filesOf(12), {});

      expect(idsOf(spec)).toStrictEqual(FIRST_TEN);
    });

    it('WHEN read THEN 2 are hidden', () => {
      const spec = specOf(filesOf(12), {});

      expect(spec.hidden).toBe(2);
    });

    it('WHEN read THEN the count node takes the last slot of the grid', () => {
      const spec = specOf(filesOf(12), {});

      expect(spec.fileIds).toStrictEqual(FIRST_TEN_AND_MORE);
    });
  });

  describe('GIVEN a group of 40 free files', () => {
    describe('WHEN two later files failed', () => {
      const failed15 = failedOf(15, 15);
      const failed30 = failedOf(30, 30);
      const outcomes = { ...failed15, ...failed30 };

      it('THEN they are drawn first, then the earliest of the rest', () => {
        const spec = specOf(filesOf(40), outcomes);

        expect(idsOf(spec)).toStrictEqual(FAILED_FIRST);
      });

      it('THEN 30 are hidden', () => {
        const spec = specOf(filesOf(40), outcomes);

        expect(spec.hidden).toBe(30);
      });

      it('THEN the grid ends with the count node', () => {
        const spec = specOf(filesOf(40), outcomes);

        expect(spec.fileIds).toStrictEqual(FAILED_FIRST_AND_MORE);
      });
    });

    it('WHEN 12 files failed THEN the first 10 of them are drawn and no other', () => {
      const expected = rangeIds(11, 20);

      const spec = specOf(filesOf(40), failedOf(11, 22));

      expect(idsOf(spec)).toStrictEqual(expected);
    });

    it('WHEN a file passed THEN it ranks with the files that have no outcome', () => {
      const outcomes: Record<string, GraphAtomOutcome> = { [idOf(30)]: 'passed' };

      const spec = specOf(filesOf(40), outcomes);

      expect(idsOf(spec)).toStrictEqual(FIRST_TEN);
    });
  });

  describe('GIVEN a group of 12 free files and 2 files whose ids are tasks', () => {
    const taskFiles = [fileOf('app#build'), fileOf('app#lint')];
    const taskBoxes = new Map([
      ['app#build', 'pkg:app'],
      ['app#lint', 'pkg:app']
    ]);
    const placedBoxes = [...PLACEMENT.pkgBoxes];
    const taskBoxEntries = [...taskBoxes];
    const pkgBoxes = new Map([...placedBoxes, ...taskBoxEntries]);
    const placement = { ...PLACEMENT, pkgBoxes };

    it('WHEN read THEN the task files are not drawn', () => {
      const free = filesOf(12);
      const files = [...free, ...taskFiles];

      const spec = specOf(files, {}, placement);

      expect(idsOf(spec)).toStrictEqual(FIRST_TEN);
    });

    it('WHEN read THEN the task files are not in the hidden count', () => {
      const free = filesOf(12);
      const files = [...free, ...taskFiles];

      const spec = specOf(files, {}, placement);

      expect(spec.hidden).toBe(2);
    });

    it('WHEN read THEN the task files are not in the grid', () => {
      const free = filesOf(12);
      const files = [...free, ...taskFiles];

      const spec = specOf(files, {}, placement);

      expect(spec.fileIds).toStrictEqual(FIRST_TEN_AND_MORE);
    });
  });

  it('GIVEN the umbrella app#e2e WHEN moreIdOf reads it THEN its count node id is atom-more: before it', () => {
    expect(moreIdOf('app#e2e')).toBe(MORE_ID);
  });

  it('GIVEN outcomes kept for an umbrella WHEN outcomesOf reads it THEN they are returned', () => {
    const kept: Record<string, GraphAtomOutcome> = { [idOf(1)]: 'failed' };
    const byUmbrella = new Map([['app#e2e', kept]]);

    const outcomes = outcomesOf(byUmbrella, 'app#e2e');

    expect(outcomes).toBe(kept);
  });

  it('GIVEN no outcomes kept for an umbrella WHEN outcomesOf reads it THEN there are none', () => {
    const byUmbrella = new Map<string, Record<string, GraphAtomOutcome>>();

    const outcomes = outcomesOf(byUmbrella, 'app#e2e');

    expect(outcomes).toStrictEqual({});
  });
});
