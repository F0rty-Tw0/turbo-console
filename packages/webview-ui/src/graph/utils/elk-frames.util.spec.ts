import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { boxFramesOf } from './elk-frames.util.ts';
import { folderIdOf } from './folder-id.util.ts';
import { titleSlotIdOf } from './task-compound.util.ts';
import type { BoxFrame } from '../common/layout.type.ts';

const SLOT: ElkNode = { id: titleSlotIdOf('api'), x: 40, y: 8, width: 60, height: 13 };

const LEAF: ElkNode = { id: 'api#build', x: 35, y: 41, width: 80, height: 32 };

const BOX: ElkNode = { id: 'pkg:api', x: 5, y: 5, width: 150, height: 120, children: [SLOT, LEAF] };

const FOLDER: ElkNode = { id: folderIdOf('apps'), x: 10, y: 20, children: [BOX] };

const API_FRAME: BoxFrame = { leafId: 'api#build', left: -75, right: 75, top: -57, bottom: 63, titleX: -35, titleY: -49 };

describe('FEATURE: boxFramesOf', () => {
  describe('GIVEN a titled-row box inside a folder at (10, 20), the box at (5, 5)', () => {
    it('WHEN framed THEN its sides and title corner are relative to the centre of its leaf', () => {
      const laidOut: ElkNode = { id: 'root', x: 0, y: 0, children: [FOLDER] };

      expect(boxFramesOf(laidOut)).toStrictEqual({ 'pkg:api': API_FRAME });
    });
  });

  describe('GIVEN a package box with no title slot', () => {
    it('WHEN framed THEN it has no entry', () => {
      const plain: ElkNode = { ...BOX, children: [LEAF] };
      const laidOut: ElkNode = { id: 'root', children: [plain] };

      expect(boxFramesOf(laidOut)).toStrictEqual({});
    });
  });

  describe('GIVEN a package graph', () => {
    it('WHEN framed THEN there are no frames', () => {
      const a: ElkNode = { id: 'a', x: 0, y: 0, width: 10, height: 10 };
      const laidOut: ElkNode = { id: 'root', children: [a] };

      expect(boxFramesOf(laidOut)).toStrictEqual({});
    });
  });

  describe('GIVEN a box missing its task', () => {
    it('WHEN framed THEN it has no entry', () => {
      const lone: ElkNode = { ...BOX, children: [SLOT] };
      const laidOut: ElkNode = { id: 'root', children: [lone] };

      expect(boxFramesOf(laidOut)).toStrictEqual({});
    });
  });
});
