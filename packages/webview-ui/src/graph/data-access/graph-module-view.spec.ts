import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createModuleCanvas } from './graph-module-view.ts';
import type { Positions } from '../../bridge/common/graph-state.type.ts';
import { MODULE_LAZY_CLASS, MODULE_TYPE_CLASS } from '../common/graph-module.const.ts';
import type { ModuleCanvas, ModuleDrawing } from '../common/module-canvas.type.ts';
import type { ModuleScene, ModuleShown } from '../common/module-scene.type.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB, MODULE_MEASURES_STUB } from '../test/stubs/module-scene.stub.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { moduleSceneOf } from '../utils/module-scene.util.ts';
import { moduleTreeOf } from '../utils/module-tree.util.ts';

const MODULE_STYLE_CLASSES = [MODULE_LAZY_CLASS, MODULE_TYPE_CLASS];

const TREE = moduleTreeOf(MODULES_FOUND_STUB.files);

const SCENE: ModuleScene = moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded: ['src'], shown: ALL_SHOWN_STUB });

const LIB_OPEN: ModuleScene = moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded: ['src', 'src/lib'], shown: ALL_SHOWN_STUB });

const TESTS_HIDDEN: ModuleShown = { ...ALL_SHOWN_STUB, tests: false };

const NO_TESTS: ModuleScene = moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded: ['src'], shown: TESTS_HIDDEN });

const ROOT_ONLY: ModuleScene = moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded: [], shown: ALL_SHOWN_STUB });

const ROOT_ONLY_NO_TESTS: ModuleScene = moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded: [], shown: TESTS_HIDDEN });

/** No centre listed: every card is drawn at the origin. */
const AT_ORIGIN: Positions = {};

const A_ID = 'file:src/a.ts';

const LIB_ID = 'dir:src/lib';

const B_ID = 'file:src/lib/b.ts';

const SPEC_ID = 'file:src/a.spec.ts';

const drawingOf = (scene: ModuleScene): ModuleDrawing => {
  const drawing: ModuleDrawing = { scene, positions: AT_ORIGIN, measures: MODULE_MEASURES_STUB };

  return drawing;
};

describe('FEATURE: createModuleCanvas', () => {
  let cy: Core;
  let canvas: ModuleCanvas;

  beforeEach(() => {
    cy = cytoscape({ headless: true });
    canvas = createModuleCanvas(cy);
    canvas.show({ scene: SCENE, positions: AT_ORIGIN, measures: MODULE_MEASURES_STUB });
  });

  afterEach(() => cy.destroy());

  describe('GIVEN web drawn with src expanded', () => {
    it('WHEN the root and src are read THEN src is a box inside the root box', () => {
      expect([cy.$id('dir:src').hasClass('module-box'), cy.$id('dir:src').data('parent')]).toStrictEqual([true, 'dir:']);
    });

    it('WHEN src/lib is read THEN it is a collapsed folder card labelled with its name and file count', () => {
      expect([cy.$id('dir:src/lib').hasClass('module-dir'), cy.$id('dir:src/lib').data('label')]).toStrictEqual([true, 'lib/ 2']);
    });

    it('WHEN a.ts is read THEN it is a file card labelled with its basename', () => {
      expect([cy.$id('file:src/a.ts').hasClass('module-file'), cy.$id('file:src/a.ts').data('label')]).toStrictEqual([true, 'a.ts']);
    });

    it('WHEN the stub @s/x is read THEN it is a stub card at the root', () => {
      expect([cy.$id('pkg:@s/x').hasClass('module-stub'), cy.$id('pkg:@s/x').isChild()]).toStrictEqual([true, false]);
    });

    it.each([
      ['file:src/a.ts', 'dir:src/lib', [], '3'],
      ['file:src/a.spec.ts', 'pkg:@s/y', ['module-type'], ''],
      ['dir:src/lib', 'pkg:@s/x', [], '']
    ])('WHEN the link %s → %s is read THEN its style classes are %j and its count label is %s', (source, target, classes, count) => {
      const edge = cy.$id(edgeIdOf({ source, target }));

      expect([MODULE_STYLE_CLASSES.filter((name) => edge.hasClass(name)), edge.data('count')]).toStrictEqual([classes, count]);
    });

    it.each([
      ['dir:', 'box'],
      ['dir:src/lib', 'dir'],
      ['file:src/a.ts', 'file'],
      ['pkg:@s/x', 'stub'],
      ['file:gone.ts', null]
    ])('WHEN the kind of %s is read THEN it is %s', (id, kind) => {
      expect(canvas.kindOf(id)).toBe(kind);
    });

    it('WHEN the centre of a card not drawn is read THEN there is none', () => {
      expect(canvas.renderedCentre('file:gone.ts')).toBeNull();
    });

    it('WHEN it is cleared THEN no element is left', () => {
      canvas.clear();

      expect(cy.elements()).toHaveLength(0);
    });

    it('WHEN a.ts is painted THEN it is selected, its neighbours lit and an unrelated card dimmed', () => {
      canvas.paint('file:src/a.ts');

      expect([
        cy.$id('file:src/a.ts').hasClass('selected'),
        cy.$id('dir:src/lib').hasClass('highlighted'),
        cy.$id('dir:src/ui').hasClass('dimmed')
      ]).toStrictEqual([true, true, true]);
    });

    it('WHEN a.ts is painted and then nothing THEN every card is normal again', () => {
      canvas.paint('file:src/a.ts');
      canvas.paint(null);

      expect([cy.$id('file:src/a.ts').hasClass('normal'), cy.$id('dir:src/ui').hasClass('normal')]).toStrictEqual([true, true]);
    });

    it('WHEN a.ts is painted and src/lib is opened THEN a.ts stays selected with its new neighbour b.ts lit', () => {
      canvas.paint(A_ID);
      canvas.show(drawingOf(LIB_OPEN));

      expect([cy.$id(A_ID).hasClass('selected'), cy.$id(B_ID).hasClass('highlighted')]).toStrictEqual([true, true]);
    });

    it('WHEN b.ts inside the collapsed src/lib is painted THEN the src/lib card is selected', () => {
      canvas.paint(B_ID);

      expect(cy.$('.selected').map((node) => node.id())).toStrictEqual([LIB_ID]);
    });

    it('WHEN b.ts inside the collapsed src/lib is painted and src/lib opened THEN b.ts is selected, as it stayed the choice', () => {
      canvas.paint(B_ID);
      canvas.show(drawingOf(LIB_OPEN));

      expect(cy.$('.selected').map((node) => node.id())).toStrictEqual([B_ID]);
    });

    it('WHEN a.ts is painted, the canvas cleared and the scene drawn again THEN nothing is selected', () => {
      canvas.paint(A_ID);
      canvas.clear();
      canvas.show(drawingOf(SCENE));

      expect(cy.$('.selected')).toHaveLength(0);
    });
  });

  describe('GIVEN web drawn with src/lib open and b.ts painted', () => {
    beforeEach(() => {
      canvas.show(drawingOf(LIB_OPEN));
      canvas.paint(B_ID);
    });

    it('WHEN src/lib is closed THEN the src/lib card that now holds b.ts is selected', () => {
      canvas.show(drawingOf(SCENE));

      expect(cy.$('.selected').map((node) => node.id())).toStrictEqual([LIB_ID]);
    });

    it('WHEN src/lib is closed and opened again THEN b.ts is selected again', () => {
      canvas.show(drawingOf(SCENE));
      canvas.show(drawingOf(LIB_OPEN));

      expect(cy.$('.selected').map((node) => node.id())).toStrictEqual([B_ID]);
    });
  });

  describe('GIVEN web drawn with src open and the test file a.spec.ts painted', () => {
    beforeEach(() => {
      canvas.paint(SPEC_ID);
    });

    it('WHEN test files are hidden and shown again THEN nothing is selected, as hiding dropped the choice', () => {
      canvas.show(drawingOf(NO_TESTS));
      canvas.show(drawingOf(SCENE));

      expect(cy.$('.selected')).toHaveLength(0);
    });

    it.each([
      { order: 'src is collapsed, then test files are hidden', scenes: [ROOT_ONLY, ROOT_ONLY_NO_TESTS] },
      { order: 'test files are hidden, then src is collapsed', scenes: [NO_TESTS, ROOT_ONLY_NO_TESTS] }
    ])('WHEN $order and test files are shown again THEN nothing is selected, as hiding dropped the choice', ({ scenes }) => {
      for (const scene of scenes) canvas.show(drawingOf(scene));

      canvas.show(drawingOf(ROOT_ONLY));

      expect(cy.$('.selected')).toHaveLength(0);
    });
  });
});
