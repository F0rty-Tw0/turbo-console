import { describe, expect, it } from 'vitest';

import { atomPositionsOf } from './atom-positions.util.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomBoxSpec, BoxBounds } from '../common/atom-layout.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';

/** The `[x, y]` centre of each id, in order; an id with no position gives `[]`. */
const centresOf = (positions: Positions, ids: string[]): number[][] => {
  const centreOf = (id: string): number[] => {
    const centre = positions[id];

    if (centre === undefined) return [];

    return [centre.x, centre.y];
  };

  return ids.map(centreOf);
};

/** The `[x, y, width, height]` frame of a box. */
const frameOf = (boxes: Readonly<Record<string, BoxBounds>>, id: string): number[] => {
  const box = boxes[id];

  if (box === undefined) return [];

  return [box.x, box.y, box.width, box.height];
};

const filesOf = (prefix: string, count: number): string[] => {
  const ids: string[] = [];

  for (let number = 1; number <= count; number++) ids.push(`${prefix}${number}`);

  return ids;
};

/** The centres of `[id, x, y]` rows. */
const positionsOf = (rows: [string, number, number][]): Positions => {
  const entryOf = ([id, x, y]: [string, number, number]): [string, Position] => {
    const centre: Position = { x, y };

    return [id, centre];
  };

  return Object.fromEntries(rows.map(entryOf));
};

const SIZE_160X52: NodeSize = { width: 160, height: 52 };

const SIZE_40X10: NodeSize = { width: 40, height: 10 };

const SIZE_80X40: NodeSize = { width: 80, height: 40 };

const BASE_ROWS: [string, number, number][] = [
  ['U', 180, 126],
  ['R', 400, 126],
  ['D', 180, 300],
  ['DR', 400, 300],
  ['UR', 400, 40],
  ['DL', 20, 300],
  ['L', 20, 126]
];

/** U is 160x52 and centred (180, 126), so its top-left is (100, 100), its right edge 260 and its bottom 152. */
const BASE = positionsOf(BASE_ROWS);

const U_SPEC: AtomBoxSpec = { umbrellaId: 'U', umbrellaSize: SIZE_160X52, fileIds: filesOf('f', 4) };

/** A group of `count` files on U; U_SPEC is four. */
const specOf = (count: number): AtomBoxSpec => {
  const spec: AtomBoxSpec = { ...U_SPEC, fileIds: filesOf('f', count) };

  return spec;
};

/** A and B are 160x52 with four files each; A is above B but to the right, so base y order and base x order differ. */
const PAIR_BASE = positionsOf([
  ['A', 300, 100],
  ['B', 100, 120]
]);

const A_SPEC: AtomBoxSpec = { umbrellaId: 'A', umbrellaSize: SIZE_160X52, fileIds: filesOf('f', 4) };

const B_SPEC: AtomBoxSpec = { umbrellaId: 'B', umbrellaSize: SIZE_160X52, fileIds: filesOf('g', 4) };

describe('FEATURE: atom positions', () => {
  describe('GIVEN U (160x52, centre 180,126) with four files and six neighbours', () => {
    it('WHEN U expands THEN U and its 2x2 grid sit in a 224x132 box at U’s old top-left', () => {
      const { positions, boxes } = atomPositionsOf(BASE, [U_SPEC], new Set(['U']));

      // columns = ceil(sqrt(4)) = 2, rows = 2; box 224 = max(160, 2*96+8) + 24, 132 = 52 + 8 + (2*20+8) + 24
      expect(frameOf(boxes, 'atom:U')).toStrictEqual([100, 100, 224, 132]);
      // U: (100+12+80, 100+12+26); f1 left 112 + 48, top 100+12+52+8 = 172 + 10; f2 + 104; f3 + 28
      expect(centresOf(positions, ['U', 'f1', 'f2', 'f3', 'f4'])).toStrictEqual([
        [192, 138],
        [160, 182],
        [264, 182],
        [160, 210],
        [264, 210]
      ]);
    });

    it('WHEN U expands THEN R moves +64 x, D +80 y, DR both, L stays', () => {
      const { positions } = atomPositionsOf(BASE, [U_SPEC], new Set(['U']));

      // Δw = 224 - 160 = 64, Δh = 132 - 52 = 80
      expect(centresOf(positions, ['R', 'D', 'DR', 'L'])).toStrictEqual([
        [464, 126],
        [180, 380],
        [464, 380],
        [20, 126]
      ]);
    });

    it('WHEN U expands THEN UR moves in x only and DL in y only', () => {
      const { positions } = atomPositionsOf(BASE, [U_SPEC], new Set(['U']));

      // UR: 400 > 260, 40 < 152; DL: 20 < 260, 300 > 152
      expect(centresOf(positions, ['UR', 'DL'])).toStrictEqual([
        [464, 40],
        [20, 380]
      ]);
    });

    it('WHEN a node centre lies exactly on U’s right edge or bottom edge THEN it stays', () => {
      const edgeBase = positionsOf([...BASE_ROWS, ['ER', 260, 126], ['ED', 180, 152]]);

      const { positions } = atomPositionsOf(edgeBase, [U_SPEC], new Set(['U']));

      // 260 is not > 260 and 152 is not > 152
      expect(centresOf(positions, ['ER', 'ED'])).toStrictEqual([
        [260, 126],
        [180, 152]
      ]);
    });

    it('WHEN expanded is {} after {U} THEN every position equals the base exactly', () => {
      atomPositionsOf(BASE, [U_SPEC], new Set(['U']));

      const { positions, boxes } = atomPositionsOf(BASE, [U_SPEC], new Set());

      expect(positions).toStrictEqual(BASE);
      expect(boxes).toStrictEqual({});
    });

    it('WHEN a group has one file THEN columns is 1', () => {
      const { positions, boxes } = atomPositionsOf(BASE, [specOf(1)], new Set(['U']));

      // columns 1, rows 1: box 184 = max(160, 96) + 24, 104 = 52 + 8 + 20 + 24; Δw 24, Δh 52
      expect(frameOf(boxes, 'atom:U')).toStrictEqual([100, 100, 184, 104]);
      expect(centresOf(positions, ['f1', 'R', 'D'])).toStrictEqual([
        [160, 182],
        [424, 126],
        [180, 352]
      ]);
    });

    it('WHEN the file list is replaced by nine files under the same base THEN the grid and the shifts follow the new count', () => {
      const { positions, boxes } = atomPositionsOf(BASE, [specOf(9)], new Set(['U']));

      // columns 3, rows 3: box 328 = max(160, 3*96+16) + 24, 160 = 52 + 8 + (3*20+16) + 24; Δw 168, Δh 108
      expect(frameOf(boxes, 'atom:U')).toStrictEqual([100, 100, 328, 160]);
      expect(centresOf(positions, ['f1', 'f4', 'f9', 'R', 'D'])).toStrictEqual([
        [160, 182],
        [160, 210],
        [368, 238],
        [568, 126],
        [180, 408]
      ]);
    });

    it('WHEN a group has ten files THEN columns is 4 and rows is 3', () => {
      const { positions, boxes } = atomPositionsOf(BASE, [specOf(10)], new Set(['U']));

      // columns = ceil(sqrt(10)) = 4, rows = ceil(10 / 4) = 3: box 432 = max(160, 4*96+3*8) + 24, 160 = 52 + 8 + (3*20+2*8) + 24
      expect(frameOf(boxes, 'atom:U')).toStrictEqual([100, 100, 432, 160]);
      // f4 is the last of row 1 (112 + 3*104 + 48, 182); f5 starts row 2 (160, 210); f10 is the 2nd of row 3 (264, 238)
      expect(centresOf(positions, ['f4', 'f5', 'f10'])).toStrictEqual([
        [472, 182],
        [160, 210],
        [264, 238]
      ]);
    });

    it('WHEN a group has no files THEN it is skipped and nothing moves', () => {
      const { positions, boxes } = atomPositionsOf(BASE, [specOf(0)], new Set(['U']));

      expect(positions).toStrictEqual(BASE);
      expect(boxes).toStrictEqual({});
    });

    it('WHEN the expanded umbrella has no base position THEN it is skipped and nothing moves', () => {
      const { positions, boxes } = atomPositionsOf(BASE, [{ ...U_SPEC, umbrellaId: 'ghost' }], new Set(['ghost']));

      expect(positions).toStrictEqual(BASE);
      expect(boxes).toStrictEqual({});
    });
  });

  describe('GIVEN A above B but to its right, each with four files', () => {
    it('WHEN {A, B} and {B, A} are expanded THEN the results are equal', () => {
      const first = atomPositionsOf(PAIR_BASE, [A_SPEC, B_SPEC], new Set(['A', 'B']));

      const second = atomPositionsOf(PAIR_BASE, [B_SPEC, A_SPEC], new Set(['B', 'A']));

      expect(second).toStrictEqual(first);
    });

    it('WHEN both expand THEN A goes first by base y, so B is not pushed down by A’s box', () => {
      const { positions, boxes } = atomPositionsOf(PAIR_BASE, [A_SPEC, B_SPEC], new Set(['A', 'B']));

      // A: top-left (220, 74), right 380, bottom 126, B centre (100, 120) is neither right of nor below it; box 224x132 at (220, 74)
      // B: top-left (20, 94), right 180, bottom 146; A's umbrella (312, 112) is right of 180 (+64 x) and not below 146
      expect(frameOf(boxes, 'atom:A')).toStrictEqual([284, 74, 224, 132]);
      expect(frameOf(boxes, 'atom:B')).toStrictEqual([20, 94, 224, 132]);
      expect(centresOf(positions, ['A', 'f1', 'f4', 'B', 'g1', 'g4'])).toStrictEqual([
        [376, 112],
        [344, 156],
        [448, 184],
        [112, 132],
        [80, 176],
        [184, 204]
      ]);
    });
  });

  describe('GIVEN B right of A on the same row and only 10 px tall', () => {
    const base = positionsOf([
      ['A', 100, 100],
      ['B', 300, 100]
    ]);
    const flatB: AtomBoxSpec = { umbrellaId: 'B', umbrellaSize: SIZE_40X10, fileIds: filesOf('g', 4) };
    const specs: AtomBoxSpec[] = [A_SPEC, flatB];

    it('WHEN both expand THEN B’s box pushes A’s box and umbrella down, not across', () => {
      const { positions, boxes } = atomPositionsOf(base, specs, new Set(['A', 'B']));

      // A first (same y, smaller x): top-left (20, 74), right 180, bottom 126; B (300, 100) is right of 180 and moves +64 x to (364, 100)
      // B: top-left (344, 95), right 384, bottom 105, Δh 90 - 10 = 80; A's umbrella (112, 112) is not right of 384 but below 105, so A moves +80 y
      expect(frameOf(boxes, 'atom:A')).toStrictEqual([20, 154, 224, 132]);
      expect(frameOf(boxes, 'atom:B')).toStrictEqual([344, 95, 224, 90]);
      expect(centresOf(positions, ['A', 'f1', 'B'])).toStrictEqual([
        [112, 192],
        [80, 236],
        [376, 112]
      ]);
    });
  });

  describe('GIVEN B below-left of A, with a file of A left of B’s right edge', () => {
    const base = positionsOf([
      ['A', 180, 126],
      ['B', 136, 300]
    ]);
    const smallB: AtomBoxSpec = { umbrellaId: 'B', umbrellaSize: SIZE_80X40, fileIds: filesOf('g', 4) };
    const specs: AtomBoxSpec[] = [A_SPEC, smallB];

    it('WHEN B expands after A THEN all of A (umbrella, files, box) move by one delta, including a file whose own centre is not right of B', () => {
      const { positions, boxes } = atomPositionsOf(base, specs, new Set(['A', 'B']));

      // A first: box (100, 100, 224, 132), umbrella (192, 138), f1 (160, 182), f2 (264, 182), f3 (160, 210), f4 (264, 210)
      // B (136, 300) is below A's bottom 152, so A's Δh moves it to (136, 380): top-left (96, 360), right 176, bottom 400, Δw 224 - 80 = 144
      // A's umbrella 192 > 176 moves +144 x, 138 < 400 stays; f1 (160) is not > 176 but follows its umbrella
      expect(frameOf(boxes, 'atom:A')).toStrictEqual([244, 100, 224, 132]);
      expect(centresOf(positions, ['A', 'f1', 'f2', 'f3', 'f4'])).toStrictEqual([
        [336, 138],
        [304, 182],
        [408, 182],
        [304, 210],
        [408, 210]
      ]);
    });

    it('WHEN B expands after A THEN B’s box and grid sit at B’s top-left after A pushed it down', () => {
      const { positions, boxes } = atomPositionsOf(base, specs, new Set(['A', 'B']));

      // A's Δh 80 first moves B from y 300 to 380, so B's top-left is (96, 360)
      // box width max(80, 200) + 24 = 224, height 40 + 8 + 48 + 24 = 120; B (96+12+40, 360+12+20); g1 left 108 + 48, top 360+12+40+8 = 420 + 10
      expect(frameOf(boxes, 'atom:B')).toStrictEqual([96, 360, 224, 120]);
      expect(centresOf(positions, ['B', 'g1', 'g4'])).toStrictEqual([
        [148, 392],
        [156, 430],
        [260, 458]
      ]);
    });
  });

  describe('GIVEN an open group named like an inherited member that the base does not place', () => {
    const lowerBase = positionsOf([
      ['a', 100, 120],
      ['z', 300, 100]
    ]);
    const aSpec: AtomBoxSpec = { ...A_SPEC, umbrellaId: 'a' };
    const zSpec: AtomBoxSpec = { ...B_SPEC, umbrellaId: 'z' };
    const inheritedSpec: AtomBoxSpec = { ...A_SPEC, umbrellaId: 'constructor', fileIds: ['c1'] };
    const open = new Set(['a', 'constructor', 'z']);

    it('WHEN the groups open THEN the placed ones still open in base order and it opens nothing', () => {
      const withoutIt = atomPositionsOf(lowerBase, [aSpec, zSpec], new Set(['a', 'z']));
      const withIt = atomPositionsOf(lowerBase, [aSpec, inheritedSpec, zSpec], open);

      expect(withIt).toStrictEqual(withoutIt);
    });
  });
});
