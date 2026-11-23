import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphModuleSelection } from './graph-module-selection.ts';
import type { GraphScanModuleSitesMessage, ModuleEnd } from '../../bridge/common/graph-module-sites.type.ts';
import type { ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { ModuleSelection, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleCanvas } from '../common/module-canvas.type.ts';
import type { ModuleDetailsView, ModuleSitesState } from '../common/module-details.type.ts';
import type { ModulePhase, ModuleRedraw } from '../common/module-mode.type.ts';
import type { ModuleScene } from '../common/module-scene.type.ts';
import type { ModuleFolds } from '../common/module-selection.type.ts';
import type { ModuleSelectionRig } from '../test/common/graph-module-selection.type.ts';
import { moduleCanvasMock } from '../test/mocks/module-canvas.mock.ts';
import { MODULE_SITES_FOUND_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';
import { moduleSelectionRigOf, sitesReplyOf } from '../test/utils/graph-module-selection.spec.util.ts';
import { link, node } from '../test/utils/module-selections.spec.util.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';
import { detailsViewOf } from '../utils/module-details-view.util.ts';
import { moduleSceneOf } from '../utils/module-scene.util.ts';
import { moduleTreeOf } from '../utils/module-tree.util.ts';

const B_ID = 'file:src/lib/b.ts';

const B = { kind: 'node', id: B_ID } as const satisfies ModuleSelection;

const A = node('file:src/a.ts');

const B_END: ModuleEnd = { kind: 'file', path: 'src/lib/b.ts' };

const A_END: ModuleEnd = { kind: 'file', path: 'src/a.ts' };

const X_END: ModuleEnd = { kind: 'stub', name: '@s/x' };

const LIB_END: ModuleEnd = { kind: 'dir', path: 'src/lib' };

const B_ASK: GraphScanModuleSitesMessage = { type: 'scanModuleSites', packageName: 'web', from: B_END, to: null };

const A_ASK: GraphScanModuleSitesMessage = { ...B_ASK, from: A_END };

const B_FOUND = sitesReplyOf(B_ASK, MODULE_SITES_FOUND_STUB);

const FIT: ModuleRedraw = { kind: 'fit' };

const CLOSED: ModuleFolds = { imports: false, importedBy: false };

const FIRST_SCAN: ModuleSitesState = { kind: 'scanning', previous: null };

const FOUND_STATE: ModuleSitesState = { kind: 'found', result: MODULE_SITES_FOUND_STUB };

const RESCAN: ModuleSitesState = { kind: 'scanning', previous: MODULE_SITES_FOUND_STUB };

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const WEB: ModulesViewState = { ...FRESH_WEB, expanded: ['src'] };

const SHOWN: ModulePhase = { kind: 'shown', name: 'web', found: MODULES_FOUND_STUB };

const TREE = moduleTreeOf(MODULES_FOUND_STUB.files);

const SCENE: ModuleScene = moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded: ['src'], shown: ALL_SHOWN_STUB, focus: null });

const LIB_OPEN: ModuleScene = moduleSceneOf(TREE, MODULES_FOUND_STUB, {
  expanded: ['src', 'src/lib'],
  shown: ALL_SHOWN_STUB,
  focus: null
});

/** The link title of a shown Details view. */
const titleOf = (shown: ModuleDetailsView | undefined): string | null => (shown?.kind === 'link' ? shown.title : null);

const isNotB = (file: string): boolean => file !== 'src/lib/b.ts';

const WITHOUT_B: ModulesFound = { ...MODULES_FOUND_STUB, files: MODULES_FOUND_STUB.files.filter(isNotB) };

describe('FEATURE: module selection and lookups', () => {
  let canvas: Mocked<ModuleCanvas>;
  let rig: ModuleSelectionRig;
  let selection: GraphModuleSelection;

  beforeEach(() => {
    canvas = moduleCanvasMock();
    rig = moduleSelectionRigOf(WEB, SHOWN, canvas);
    selection = new GraphModuleSelection(rig.deps);
    selection.drawn(SCENE);
  });

  describe('GIVEN web Shown, nothing selected', () => {
    it('WHEN b.ts is selected THEN it is painted, saved, Details shows its file view scanning, and B_ASK is posted once', () => {
      selection.select(B);

      expect([canvas.paint.mock.calls, rig.saved()?.selected, rig.show.mock.lastCall, rig.post.mock.calls]).toStrictEqual([
        [[B]],
        B,
        [detailsViewOf(B, FIRST_SCAN, CLOSED)],
        [[B_ASK]]
      ]);
    });

    it('WHEN the @s/x stub is selected THEN the stub view scanning shows and (stub @s/x, null) is asked', () => {
      const stub = node('pkg:@s/x');
      const ask: GraphScanModuleSitesMessage = { ...B_ASK, from: X_END };

      selection.select(stub);

      expect([rig.show.mock.lastCall, rig.post.mock.calls]).toStrictEqual([[detailsViewOf(stub, FIRST_SCAN, CLOSED)], [[ask]]]);
    });

    it('WHEN the link file:src/a.ts → dir:src/lib is selected THEN the title reads "src/a.ts → src/lib/" and (file src/a.ts, dir src/lib) is asked', () => {
      const ask: GraphScanModuleSitesMessage = { ...A_ASK, to: LIB_END };

      selection.select(link('file:src/a.ts', 'dir:src/lib'));

      expect([titleOf(rig.show.mock.lastCall?.[0]), rig.post.mock.calls]).toStrictEqual(['src/a.ts → src/lib/', [[ask]]]);
    });
  });

  describe('GIVEN web Shown, b.ts selected, its ask pending', () => {
    beforeEach(() => {
      selection.select(B);
      vi.clearAllMocks();
    });

    it('WHEN b.ts is selected again THEN it is repainted only: no save, no post', () => {
      selection.select(B);

      expect([canvas.paint.mock.calls, rig.mode.save.mock.calls, rig.post.mock.calls]).toStrictEqual([[[B]], [], []]);
    });

    it('WHEN a.ts is selected THEN a.ts is asked, and the late b.ts reply is ignored', () => {
      selection.select(A);
      selection.replied(B_FOUND);

      expect([rig.post.mock.calls, rig.show.mock.calls]).toStrictEqual([[[A_ASK]], [[detailsViewOf(A, FIRST_SCAN, CLOSED)]]]);
    });

    it('WHEN the matching reply lands THEN Details shows the found file view and pending is cleared', () => {
      selection.replied(B_FOUND);
      selection.replied(B_FOUND);

      expect(rig.show.mock.calls).toStrictEqual([[detailsViewOf(B, FOUND_STATE, CLOSED)]]);
    });

    it('WHEN a reply for web with another `from` lands THEN nothing is shown', () => {
      selection.replied(sitesReplyOf(A_ASK, MODULE_SITES_FOUND_STUB));

      expect(rig.show).not.toHaveBeenCalled();
    });

    it('WHEN the background clears THEN null is painted and saved, the empty view shows and the b.ts reply is ignored', () => {
      selection.clear();
      selection.replied(B_FOUND);

      expect([canvas.paint.mock.calls, rig.saved()?.selected, rig.show.mock.calls]).toStrictEqual([
        [[null]],
        null,
        [[{ kind: 'empty' }]]
      ]);
    });

    it('WHEN Focus is pressed on b.ts THEN focus file:src/lib/b.ts is saved, redrawn with a fit, and the selection is kept', () => {
      selection.focus(B_ID);

      expect([rig.mode.update.mock.calls, canvas.paint.mock.calls]).toStrictEqual([[[{ ...WEB, selected: B, focus: B_ID }, FIT]], []]);
    });

    it('WHEN Focus is pressed with b.ts already the focus THEN focus is cleared and redrawn with a fit', () => {
      selection.focus(B_ID);
      selection.focus(B_ID);

      expect(rig.mode.update.mock.lastCall).toStrictEqual([{ ...WEB, selected: B, focus: null }, FIT]);
    });

    it('WHEN the depth becomes 3 with no focus THEN depth 3 is saved and nothing is drawn', () => {
      selection.setDepth(3);

      expect([rig.mode.save.mock.calls, rig.mode.update.mock.calls]).toStrictEqual([[[{ ...WEB, selected: B, depth: 3 }]], []]);
    });

    it('WHEN the depth becomes 3 with a focus THEN it is redrawn with a fit', () => {
      selection.focus(B_ID);
      selection.setDepth(3);

      expect(rig.mode.update.mock.lastCall).toStrictEqual([{ ...WEB, selected: B, focus: B_ID, depth: 3 }, FIT]);
    });

    it('WHEN a Refresh answer still holds b.ts THEN B_ASK is posted again and its fold state is kept', () => {
      const folds: ModuleFolds = { imports: true, importedBy: false };

      selection.replied(B_FOUND);
      selection.fold('imports');
      selection.found(MODULES_FOUND_STUB);

      expect([rig.post.mock.calls, rig.show.mock.lastCall, rig.mode.save.mock.calls]).toStrictEqual([
        [[B_ASK]],
        [detailsViewOf(B, RESCAN, folds)],
        []
      ]);
    });

    it('WHEN a Refresh answer drops b.ts and the focus THEN selected and focus are saved null with expanded unchanged, null is painted, and the empty view shows', () => {
      selection.focus(B_ID);
      selection.found(WITHOUT_B);

      expect([rig.mode.save.mock.lastCall, canvas.paint.mock.calls, rig.show.mock.lastCall]).toStrictEqual([
        [{ ...WEB, selected: null, focus: null }],
        [[null]],
        [{ kind: 'empty' }]
      ]);
    });

    it('WHEN the mode exits (Back) THEN the b.ts reply is ignored', () => {
      selection.exit();
      selection.replied(B_FOUND);

      expect(rig.show).not.toHaveBeenCalled();
    });

    it('WHEN Scan again is pressed after the reply THEN B_ASK is posted again and the previous rows show with the scanning line', () => {
      selection.replied(B_FOUND);
      selection.scanAgain();

      expect([rig.post.mock.calls, rig.show.mock.lastCall]).toStrictEqual([[[B_ASK]], [detailsViewOf(B, RESCAN, CLOSED)]]);
    });

    it('WHEN a later draw finds canvas.selected() null (b.ts now hidden) THEN null is saved, pending dropped and the empty view shows', () => {
      selection.drawn(LIB_OPEN);
      selection.replied(B_FOUND);

      expect([rig.saved()?.selected, rig.show.mock.calls]).toStrictEqual([null, [[{ kind: 'empty' }]]]);
    });

    it('WHEN a later draw finds b.ts still chosen THEN nothing is saved or shown', () => {
      canvas.selected.mockReturnValue(B);

      selection.drawn(LIB_OPEN);

      expect([rig.mode.save.mock.calls, rig.show.mock.calls]).toStrictEqual([[], []]);
    });

    it('WHEN Clear focus is pressed with focus b.ts THEN focus null is saved, redrawn with a fit, the selection and pending are kept', () => {
      selection.focus(B_ID);
      selection.clearFocus();
      selection.replied(B_FOUND);

      expect([rig.mode.update.mock.lastCall, rig.show.mock.lastCall]).toStrictEqual([
        [{ ...WEB, selected: B, focus: null }, FIT],
        [detailsViewOf(B, FOUND_STATE, CLOSED)]
      ]);
    });
  });
});
