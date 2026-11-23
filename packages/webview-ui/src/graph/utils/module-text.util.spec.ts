import { describe, expect, it } from 'vitest';

import { moduleFocusTextOf, moduleGoneTextOf, moduleIdLabelOf, moduleLeafLabelOf, scanningTextOf } from './module-text.util.ts';
import type { ModuleLeaf } from '../common/module-scene.type.ts';

const DIR_LEAF: ModuleLeaf = { kind: 'dir', id: 'dir:src/lib', path: 'src/lib', label: 'lib/', fileCount: 2, parent: 'dir:src' };

const FILE_LEAF: ModuleLeaf = { kind: 'file', id: 'file:src/a.ts', path: 'src/a.ts', label: 'a.ts', parent: 'dir:src' };

describe('FEATURE: module mode texts', () => {
  describe('GIVEN package web', () => {
    it('WHEN its scan line is written THEN it ends in the ellipsis character', () => {
      expect(scanningTextOf('web')).toBe('Scanning web…');
    });

    it('WHEN its gone notice is written THEN it names the package', () => {
      expect(moduleGoneTextOf('web')).toBe('web is no longer in the workspace');
    });
  });

  describe('GIVEN a collapsed folder lib/ with 2 files and a file a.ts', () => {
    it.each([
      [DIR_LEAF, 'lib/ 2'],
      [FILE_LEAF, 'a.ts']
    ])('WHEN the label of %o is written THEN it reads %s', (leaf, label) => {
      expect(moduleLeafLabelOf(leaf)).toBe(label);
    });
  });

  describe('GIVEN a file, a folder and a stub id', () => {
    it.each([
      ['file:src/a.ts', 'src/a.ts'],
      ['dir:src/lib', 'src/lib/'],
      ['pkg:@s/x', '@s/x']
    ])('WHEN the label of %s is written THEN it reads %s', (id, label) => {
      expect(moduleIdLabelOf(id)).toBe(label);
    });
  });

  describe('GIVEN a Focus section line', () => {
    it.each([
      [null, 'None'],
      ['pkg:@s/x', '@s/x']
    ])('WHEN focus %s is written THEN it reads %s', (focus, text) => {
      expect(moduleFocusTextOf(focus)).toBe(text);
    });
  });
});
