import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphModuleDetails } from './graph-module-details.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ImportsViewModel } from '../common/details-imports.type.ts';
import type { ModuleDetailsView } from '../common/module-details.type.ts';
import type { ModuleDetailsRig } from '../test/common/graph-module-details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { FILE_A_VIEW_STUB, IMPORTED_BY_MODEL_STUB, IMPORTS_MODEL_STUB, STUB_X_VIEW_STUB } from '../test/stubs/module-details.stub.ts';
import { textsWith } from '../test/utils/class-elements.spec.util.ts';
import { blockOf, firstRowOf, focusOf, latestOf, moduleDetailsRigOf } from '../test/utils/graph-module-details.spec.util.ts';
import { stubElementClass } from '../test/utils/graph-package-side.spec.util.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const WEB_FOCUSED_A: ModulesViewState = { ...FRESH_WEB, focus: 'file:src/a.ts' };

const SCANNING_IMPORTS: ImportsViewModel = { ...IMPORTS_MODEL_STUB, isScanning: true };

/** `src/a.ts` while its imports are scanned again: their Scan again reads `aria-disabled`. */
const FILE_A_SCANNING: ModuleDetailsView = {
  kind: 'file',
  id: 'file:src/a.ts',
  path: 'src/a.ts',
  imports: SCANNING_IMPORTS,
  importedBy: IMPORTED_BY_MODEL_STUB
};

describe('FEATURE: module Details panel', () => {
  let rig: ModuleDetailsRig;
  let details: GraphModuleDetails;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    stubElementClass();
    rig = moduleDetailsRigOf('web');
    details = new GraphModuleDetails(rig.deps);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN entered open', () => {
    beforeEach(() => {
      details.enter(true);
    });

    it('WHEN it is entered THEN Details points at graph-module-details and the Details bar sits first in the module aside', () => {
      const { details: toggle, detailsBar } = rig.deps.page;

      expect([toggle.getAttribute('aria-controls'), toggle.getAttribute('aria-expanded'), rig.panel.hidden]).toStrictEqual([
        'graph-module-details',
        'true',
        false
      ]);
      expect([rig.panel.isConnected, rig.panel.children[0]]).toStrictEqual([true, detailsBar]);
    });

    it('WHEN a file view of src/a.ts is shown THEN the summary reads src/a.ts and the Details bar shows with Clear enabled', () => {
      const { detailsSummary, detailsBar, clear } = rig.deps.page;

      details.show(FILE_A_VIEW_STUB);

      expect([detailsSummary.textContent, detailsBar.hidden, clear.disabled]).toStrictEqual(['src/a.ts', false, false]);
    });

    it('WHEN a row of src/b.ts line 4 is clicked THEN openImport {packageName: web, file: src/b.ts, line: 4} is posted once', () => {
      details.show(FILE_A_VIEW_STUB);

      firstRowOf(latestOf(rig.built)).click();

      expect(rig.post.mock.calls).toStrictEqual([[{ type: 'openImport', packageName: 'web', file: 'src/b.ts', line: 4 }]]);
    });

    it('WHEN a row of the src/a.ts view is clicked after the @s/x stub view replaced it THEN nothing is posted', () => {
      details.show(FILE_A_VIEW_STUB);
      const old = latestOf(rig.built);

      details.show(STUB_X_VIEW_STUB);

      firstRowOf(old).click();

      expect(rig.post).not.toHaveBeenCalled();
    });

    it('WHEN Show more of importedBy is clicked THEN onFold gets importedBy', () => {
      details.show(FILE_A_VIEW_STUB);

      blockOf(latestOf(rig.built), 'importedBy').more?.click();

      expect(rig.actions.onFold.mock.calls).toStrictEqual([['importedBy']]);
    });

    it('WHEN Scan again is clicked THEN onScanAgain fires once', () => {
      details.show(FILE_A_VIEW_STUB);

      blockOf(latestOf(rig.built), 'imports').scanAgain.click();

      expect(rig.actions.onScanAgain).toHaveBeenCalledTimes(1);
    });

    it('WHEN Scan again is clicked while scanning (aria-disabled) THEN onScanAgain is not called', () => {
      details.show(FILE_A_SCANNING);

      blockOf(latestOf(rig.built), 'imports').scanAgain.click();

      expect(rig.actions.onScanAgain).not.toHaveBeenCalled();
    });

    it('WHEN Focus is clicked THEN onFocus gets file:src/a.ts', () => {
      details.show(FILE_A_VIEW_STUB);

      focusOf(latestOf(rig.built)).click();

      expect(rig.actions.onFocus.mock.calls).toStrictEqual([['file:src/a.ts']]);
    });

    it('WHEN setView carries focus file:src/a.ts THEN the button reads Clear focus, and it keeps keyboard focus when it had it', () => {
      details.show(FILE_A_VIEW_STUB);
      focusOf(latestOf(rig.built)).focus();

      details.setView(WEB_FOCUSED_A);

      const focus = focusOf(latestOf(rig.built));

      expect([textsWith(focus, 'button-label'), document.activeElement === focus]).toStrictEqual([['Clear focus'], true]);
    });

    it('WHEN setView carries the same focus again THEN no view is built again', () => {
      details.show(FILE_A_VIEW_STUB);
      details.setView(WEB_FOCUSED_A);
      const count = rig.built.length;

      details.setView(WEB_FOCUSED_A);

      expect(rig.built).toHaveLength(count);
    });

    it('WHEN a row has keyboard focus and the stub view, which has no Imports, replaces the file view THEN its Focus takes it', () => {
      details.show(FILE_A_VIEW_STUB);
      firstRowOf(latestOf(rig.built)).focus();

      details.show(STUB_X_VIEW_STUB);

      expect(document.activeElement).toBe(focusOf(latestOf(rig.built)));
    });

    it('WHEN Clear selection is clicked with the empty view shown THEN onClear is not called', () => {
      rig.deps.page.clear.click();

      expect(rig.actions.onClear).not.toHaveBeenCalled();
    });

    it('WHEN Clear selection is clicked with a file view shown THEN onClear is called once', () => {
      details.show(FILE_A_VIEW_STUB);

      rig.deps.page.clear.click();

      expect(rig.actions.onClear).toHaveBeenCalledTimes(1);
    });

    it('WHEN the Details toggle is clicked THEN the aside hides and savePanels gets {detailsOpen: false}', () => {
      rig.deps.page.details.click();

      expect([rig.panel.hidden, rig.deps.page.details.getAttribute('aria-expanded')]).toStrictEqual([true, 'false']);
      expect(rig.savePanels.mock.calls).toStrictEqual([[{ detailsOpen: false }]]);
    });
  });

  describe('GIVEN entered, a file view shown, then exited with focus on a row', () => {
    let row: HTMLButtonElement;

    beforeEach(() => {
      details.enter(true);
      details.show(FILE_A_VIEW_STUB);
      row = firstRowOf(latestOf(rig.built));
      row.focus();
      details.exit();
    });

    it('WHEN it is exited THEN the Details bar is back in aside#graph-details, Details points at graph-details and Packages has focus', () => {
      const { details: toggle, detailsBar, packagesMode } = rig.deps.page;

      expect([rig.packageAside.children[0], toggle.getAttribute('aria-controls'), rig.panel.hidden]).toStrictEqual([
        detailsBar,
        'graph-details',
        true
      ]);
      expect(document.activeElement).toBe(packagesMode);
    });

    it('WHEN a row of the old view is clicked after exit THEN nothing is posted', () => {
      row.click();

      expect(rig.post).not.toHaveBeenCalled();
    });

    it('WHEN the Details toggle is clicked after exit THEN nothing changes and savePanels is not called', () => {
      rig.deps.page.details.click();

      expect([rig.panel.hidden, rig.savePanels.mock.calls]).toStrictEqual([true, []]);
    });
  });

  describe('GIVEN no package on screen', () => {
    beforeEach(() => {
      rig = moduleDetailsRigOf(null);
      details = new GraphModuleDetails(rig.deps);
      details.enter(true);
      details.show(FILE_A_VIEW_STUB);
    });

    it('WHEN a row is clicked THEN nothing is posted', () => {
      firstRowOf(latestOf(rig.built)).click();

      expect(rig.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN no package Details aside built yet', () => {
    beforeEach(() => {
      rig = moduleDetailsRigOf('web', false);
      details = new GraphModuleDetails(rig.deps);
      details.enter(true);
    });

    it('WHEN it is exited THEN the Details bar stays in the module aside', () => {
      details.exit();

      expect(rig.panel.children[0]).toBe(rig.deps.page.detailsBar);
    });
  });
});
