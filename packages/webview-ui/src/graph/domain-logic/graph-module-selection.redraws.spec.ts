import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import type { Mocked } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphModuleSelection } from './graph-module-selection.ts';
import type { GraphScanModuleSitesMessage, ModuleEnd } from '../../bridge/common/graph-module-sites.type.ts';
import type { ModuleSelection, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleCanvas, ModuleDrawing } from '../common/module-canvas.type.ts';
import type { ModuleSitesState } from '../common/module-details.type.ts';
import type { ModulePhase, ModuleRedraw } from '../common/module-mode.type.ts';
import type { ModuleScene, ModuleShown } from '../common/module-scene.type.ts';
import type { ModuleFolds } from '../common/module-selection.type.ts';
import { createModuleCanvas } from '../data-access/graph-module-view.ts';
import type { ModuleSelectionRig } from '../test/common/graph-module-selection.type.ts';
import { moduleCanvasMock } from '../test/mocks/module-canvas.mock.ts';
import { MODULE_SITES_FOUND_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB, MODULE_MEASURES_STUB } from '../test/stubs/module-scene.stub.ts';
import { moduleSelectionRigOf, sitesReplyOf } from '../test/utils/graph-module-selection.spec.util.ts';
import { node } from '../test/utils/module-selections.spec.util.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';
import { detailsViewOf } from '../utils/module-details-view.util.ts';
import { moduleSceneOf } from '../utils/module-scene.util.ts';
import { moduleTreeOf } from '../utils/module-tree.util.ts';

const B = { kind: 'node', id: 'file:src/lib/b.ts' } as const satisfies ModuleSelection;

const B_END: ModuleEnd = { kind: 'file', path: 'src/lib/b.ts' };

const SPEC_END: ModuleEnd = { kind: 'file', path: 'src/a.spec.ts' };

const B_ASK: GraphScanModuleSitesMessage = { type: 'scanModuleSites', packageName: 'web', from: B_END, to: null };

const B_FOUND = sitesReplyOf(B_ASK, MODULE_SITES_FOUND_STUB);

const FIT: ModuleRedraw = { kind: 'fit' };

const CLOSED: ModuleFolds = { imports: false, importedBy: false };

const FOUND_STATE: ModuleSitesState = { kind: 'found', result: MODULE_SITES_FOUND_STUB };

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const WEB: ModulesViewState = { ...FRESH_WEB, expanded: ['src'] };

const SHOWN: ModulePhase = { kind: 'shown', name: 'web', found: MODULES_FOUND_STUB };

const LOADING: ModulePhase = { kind: 'loading', name: 'web' };

const FAILED: ModulePhase = { kind: 'failed', name: 'web', found: MODULES_FOUND_STUB };

const TREE = moduleTreeOf(MODULES_FOUND_STUB.files);

const SCENE: ModuleScene = moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded: ['src'], shown: ALL_SHOWN_STUB, focus: null });

const LIB_OPEN: ModuleScene = moduleSceneOf(TREE, MODULES_FOUND_STUB, {
  expanded: ['src', 'src/lib'],
  shown: ALL_SHOWN_STUB,
  focus: null
});

const TESTS_HIDDEN: ModuleShown = { ...ALL_SHOWN_STUB, tests: false };

const NO_TESTS: ModuleScene = moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded: ['src'], shown: TESTS_HIDDEN, focus: null });

const drawingOf = (scene: ModuleScene): ModuleDrawing => {
  const drawing: ModuleDrawing = { scene, positions: {}, measures: MODULE_MEASURES_STUB };

  return drawing;
};

describe('FEATURE: module selection across draws, reloads and failures', () => {
  describe('GIVEN web Shown, on the real canvas, b.ts selected with its reply landed', () => {
    let cy: Core;
    let canvas: ModuleCanvas;
    let rig: ModuleSelectionRig;
    let selection: GraphModuleSelection;
    let postsBefore: number;
    let showsBefore: number;
    let savesBefore: number;

    beforeEach(() => {
      cy = cytoscape({ headless: true });
      canvas = createModuleCanvas(cy);
      rig = moduleSelectionRigOf(WEB, SHOWN, canvas);
      selection = new GraphModuleSelection(rig.deps);
      canvas.show(drawingOf(LIB_OPEN));
      selection.drawn(LIB_OPEN);
      selection.select(B);
      selection.replied(B_FOUND);
      postsBefore = rig.post.mock.calls.length;
      showsBefore = rig.show.mock.calls.length;
      savesBefore = rig.mode.save.mock.calls.length;
    });

    afterEach(() => cy.destroy());

    it('WHEN src/lib collapses over b.ts (SCENE drawn) THEN dir:src/lib is painted, Details still shows b.ts, and nothing is posted or saved', () => {
      canvas.show(drawingOf(SCENE));
      selection.drawn(SCENE);

      expect([
        cy.$id('dir:src/lib').hasClass('selected'),
        rig.post.mock.calls.length,
        rig.show.mock.calls.length,
        rig.mode.save.mock.calls.length
      ]).toStrictEqual([true, postsBefore, showsBefore, savesBefore]);
    });

    it('WHEN src/lib then opens again (LIB_OPEN drawn) THEN b.ts is painted again and still nothing is posted', () => {
      canvas.show(drawingOf(SCENE));
      selection.drawn(SCENE);

      canvas.show(drawingOf(LIB_OPEN));
      selection.drawn(LIB_OPEN);

      expect([cy.$id(B.id).hasClass('selected'), rig.post.mock.calls.length]).toStrictEqual([true, postsBefore]);
    });
  });

  describe('GIVEN a reload: saved selected b.ts, Loading web', () => {
    let canvas: Mocked<ModuleCanvas>;
    let rig: ModuleSelectionRig;
    let selection: GraphModuleSelection;

    beforeEach(() => {
      canvas = moduleCanvasMock();
    });

    it('WHEN the found answer holds b.ts THEN B_ASK is posted once, and the first draw paints b.ts without a second post', () => {
      rig = moduleSelectionRigOf({ ...WEB, selected: B }, LOADING, canvas);
      selection = new GraphModuleSelection(rig.deps);

      selection.found(MODULES_FOUND_STUB);
      selection.drawn(LIB_OPEN);

      expect([rig.post.mock.calls, canvas.paint.mock.calls]).toStrictEqual([[[B_ASK]], [[B]]]);
    });

    it('WHEN the saved selection is the test file a.spec.ts while Test files is unchecked THEN found asks once, the first draw saves null, shows empty, and its reply is ignored', () => {
      const spec = node('file:src/a.spec.ts');
      const ask: GraphScanModuleSitesMessage = { ...B_ASK, from: SPEC_END };

      rig = moduleSelectionRigOf({ ...WEB, shown: TESTS_HIDDEN, selected: spec }, LOADING, canvas);
      selection = new GraphModuleSelection(rig.deps);
      selection.found(MODULES_FOUND_STUB);
      rig.setPhase(SHOWN);

      selection.drawn(NO_TESTS);
      selection.replied(sitesReplyOf(ask, MODULE_SITES_FOUND_STUB));

      expect([rig.post.mock.calls, rig.saved()?.selected, rig.show.mock.lastCall]).toStrictEqual([[[ask]], null, [{ kind: 'empty' }]]);
    });
  });

  describe("GIVEN web's ask pending, then a stub double tap enters ui (scanning('ui'))", () => {
    it("WHEN web's reply lands THEN it is ignored and Details keeps ui's loading view", () => {
      const rig = moduleSelectionRigOf(WEB, SHOWN, moduleCanvasMock());
      const selection = new GraphModuleSelection(rig.deps);

      selection.select(B);
      selection.scanning('ui');
      rig.setPhase({ kind: 'loading', name: 'ui' });

      selection.replied(B_FOUND);

      expect(rig.show.mock.lastCall).toStrictEqual([{ kind: 'loading', packageName: 'ui' }]);
    });
  });

  describe('GIVEN web Failed with b.ts pending', () => {
    let canvas: Mocked<ModuleCanvas>;
    let rig: ModuleSelectionRig;
    let selection: GraphModuleSelection;

    beforeEach(() => {
      canvas = moduleCanvasMock();
      rig = moduleSelectionRigOf(WEB, SHOWN, canvas);
      selection = new GraphModuleSelection(rig.deps);
      selection.select(B);
      rig.setPhase(FAILED);
      vi.clearAllMocks();
    });

    it('WHEN the matching reply lands THEN it is applied', () => {
      selection.replied(B_FOUND);

      expect(rig.show.mock.calls).toStrictEqual([[detailsViewOf(B, FOUND_STATE, CLOSED)]]);
    });

    it('WHEN select is called THEN nothing happens', () => {
      selection.select(node('file:src/a.ts'));

      expect([canvas.paint.mock.calls, rig.mode.save.mock.calls, rig.post.mock.calls]).toStrictEqual([[], [], []]);
    });

    it('WHEN Clear focus is pressed THEN focus null is saved through update (no draw off Shown)', () => {
      selection.clearFocus();

      expect(rig.mode.update.mock.calls).toStrictEqual([[{ ...WEB, selected: B, focus: null }, FIT]]);
    });

    it('WHEN Focus is pressed THEN nothing is saved or drawn', () => {
      selection.focus(B.id);

      expect([rig.mode.save.mock.calls, rig.mode.update.mock.calls]).toStrictEqual([[], []]);
    });

    it('WHEN the depth becomes 3 THEN depth 3 is saved and nothing is drawn', () => {
      selection.setDepth(3);

      expect([rig.mode.save.mock.calls, rig.mode.update.mock.calls]).toStrictEqual([[[{ ...WEB, selected: B, depth: 3 }]], []]);
    });

    it('WHEN Scan again is pressed THEN B_ASK is posted again', () => {
      selection.scanAgain();

      expect(rig.post.mock.calls).toStrictEqual([[B_ASK]]);
    });
  });

  describe('GIVEN web Loading with nothing shown', () => {
    it('WHEN Scan again or Show more is pressed THEN nothing is posted or shown', () => {
      const rig = moduleSelectionRigOf(WEB, LOADING, moduleCanvasMock());
      const selection = new GraphModuleSelection(rig.deps);

      selection.scanAgain();
      selection.fold('imports');

      expect([rig.post.mock.calls, rig.show.mock.calls]).toStrictEqual([[], []]);
    });
  });

  describe('GIVEN an overtaken draw', () => {
    it('WHEN drawn is called twice with the same scene THEN the first-draw rule runs once', () => {
      const canvas = moduleCanvasMock();
      const rig = moduleSelectionRigOf({ ...WEB, selected: B }, SHOWN, canvas);
      const selection = new GraphModuleSelection(rig.deps);

      selection.drawn(LIB_OPEN);
      selection.drawn(LIB_OPEN);

      expect([canvas.paint.mock.calls, rig.mode.save.mock.calls]).toStrictEqual([[[B]], []]);
    });
  });

  describe('GIVEN the mode off', () => {
    it('WHEN the background clears THEN nothing is painted, saved or shown', () => {
      const canvas = moduleCanvasMock();
      const rig = moduleSelectionRigOf({ ...WEB, selected: B }, { kind: 'off' }, canvas);
      const selection = new GraphModuleSelection(rig.deps);

      selection.clear();

      expect([canvas.paint.mock.calls, rig.mode.save.mock.calls, rig.show.mock.calls]).toStrictEqual([[], [], []]);
    });
  });
});
