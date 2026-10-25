import { describe, expect, it } from 'vitest';

import { atomSpecOf } from './atom-spec.util.ts';
import type { GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomFile, GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';

const SIZE: NodeSize = { width: 200, height: 48 };

const PLACEMENT: AtomPlacement = {
  shown: new Set(['app#e2e']),
  base: {},
  sizes: new Map([['app#e2e', SIZE]]),
  pkgBoxes: new Map([['app#e2e', 'pkg:app']])
};

const MORE_ID = 'atom-more:app#e2e';

const idOf = (number: number): string => `app#e2e--f${String(number).padStart(2, '0')}`;

const fileOf = (id: string): GraphAtomFile => {
  const file: GraphAtomFile = { id, specPath: 'a.spec.ts', isLive: false };

  return file;
};

const rangeIds = (from: number, to: number): string[] => {
  const numbers = Array.from({ length: to - from + 1 }, (_value, index) => from + index);

  return numbers.map(idOf);
};

const filesOf = (count: number): GraphAtomFile[] => rangeIds(1, count).map(fileOf);

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

describe('FEATURE: atomSpecOf capping the drawn files', () => {
  describe.each([10, 11])('GIVEN a group of %i free files', (count) => {
    it('WHEN read THEN every file is drawn and no count node is named', () => {
      const spec = specOf(filesOf(count), {});

      expect([spec.hidden, spec.fileIds, idsOf(spec)]).toStrictEqual([0, rangeIds(1, count), rangeIds(1, count)]);
    });
  });

  describe('GIVEN a group of 12 free files', () => {
    it('WHEN read THEN the first 10 are drawn, 2 are hidden and the count node takes the last slot', () => {
      const spec = specOf(filesOf(12), {});
      const first = rangeIds(1, 10);
      const gridIds = [...first, MORE_ID];

      expect([spec.hidden, idsOf(spec), spec.fileIds]).toStrictEqual([2, first, gridIds]);
    });
  });

  describe('GIVEN a group of 40 free files', () => {
    it('WHEN two later files failed THEN they are drawn first, then the earliest of the rest', () => {
      const failed15 = failedOf(15, 15);
      const failed30 = failedOf(30, 30);
      const outcomes = { ...failed15, ...failed30 };
      const spec = specOf(filesOf(40), outcomes);
      const firstEight = rangeIds(1, 8);
      const drawn = [idOf(15), idOf(30), ...firstEight];
      const gridIds = [...drawn, MORE_ID];

      expect([idsOf(spec), spec.hidden, spec.fileIds]).toStrictEqual([drawn, 30, gridIds]);
    });

    it('WHEN 12 files failed THEN the first 10 of them are drawn and no other', () => {
      const spec = specOf(filesOf(40), failedOf(11, 22));

      expect(idsOf(spec)).toStrictEqual(rangeIds(11, 20));
    });

    it('WHEN a file passed THEN it ranks with the files that have no outcome', () => {
      const outcomes: Record<string, GraphAtomOutcome> = { [idOf(30)]: 'passed' };
      const spec = specOf(filesOf(40), outcomes);

      expect(idsOf(spec)).toStrictEqual(rangeIds(1, 10));
    });
  });

  describe('GIVEN a group of 12 free files and 2 files whose ids are tasks', () => {
    it('WHEN read THEN the task files count in neither the hidden count nor the ids', () => {
      const taskFiles = [fileOf('app#build'), fileOf('app#lint')];
      const free = filesOf(12);
      const files = [...free, ...taskFiles];
      const taskBoxes = new Map([
        ['app#build', 'pkg:app'],
        ['app#lint', 'pkg:app']
      ]);
      const pkgBoxes = new Map([...PLACEMENT.pkgBoxes, ...taskBoxes]);
      const spec = specOf(files, {}, { ...PLACEMENT, pkgBoxes });
      const first = rangeIds(1, 10);
      const gridIds = [...first, MORE_ID];

      expect([spec.hidden, idsOf(spec), spec.fileIds]).toStrictEqual([2, first, gridIds]);
    });
  });
});
