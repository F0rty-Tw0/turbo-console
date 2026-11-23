import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphModuleDetails } from './graph-module-details.ts';
import type { ModuleDetailsView } from '../common/module-details.type.ts';
import type { ModuleDetailsRig } from '../test/common/graph-module-details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { FILE_A_VIEW_STUB, STUB_X_VIEW_STUB } from '../test/stubs/module-details.stub.ts';
import { firstRowOf, latestOf, moduleDetailsRigOf } from '../test/utils/graph-module-details.spec.util.ts';
import { stubElementClass } from '../test/utils/graph-package-side.spec.util.ts';

const EMPTY: ModuleDetailsView = { kind: 'empty' };

describe('FEATURE: module Details panel keyboard focus', () => {
  let rig: ModuleDetailsRig;
  let details: GraphModuleDetails;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    stubElementClass();
    rig = moduleDetailsRigOf('web');
    details = new GraphModuleDetails(rig.deps);
    details.enter(true);
    details.show(FILE_A_VIEW_STUB);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the src/a.ts view shown', () => {
    it('WHEN Clear selection has focus and the empty view replaces the file view THEN the empty hint takes focus', () => {
      rig.deps.page.clear.focus();

      details.show(EMPTY);

      expect(document.activeElement).toBe(latestOf(rig.built).heading);
    });

    it('WHEN a row has focus and a redraw drops the selection THEN the empty hint takes focus', () => {
      firstRowOf(latestOf(rig.built)).focus();

      details.show(EMPTY);

      expect(document.activeElement).toBe(latestOf(rig.built).heading);
    });

    it('WHEN Clear selection has focus and the stub view replaces the file view THEN Clear keeps focus', () => {
      const { clear } = rig.deps.page;

      clear.focus();

      details.show(STUB_X_VIEW_STUB);

      expect(document.activeElement).toBe(clear);
    });

    it('WHEN Details focus sits outside the view and the empty view replaces it THEN focus stays there', () => {
      const { details: toggle } = rig.deps.page;

      toggle.focus();

      details.show(EMPTY);

      expect(document.activeElement).toBe(toggle);
    });
  });
});
