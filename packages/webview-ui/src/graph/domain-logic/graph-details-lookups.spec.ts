import type { Mock, MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LinkLookups } from './graph-details-lookups.ts';
import { GraphFrames } from './graph-frames.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { EdgeImportsResult } from '../../bridge/common/graph-imports.type.ts';
import type { ManifestContext, ManifestEntry } from '../../bridge/common/graph-message.type.ts';
import type { DetailsViews } from '../common/details.type.ts';
import type { ImportsState } from '../common/imports-state.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { IMPORT_SITE_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { SAVED_FLAT_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { SCAN_WEB_TO_UI_STUB } from '../test/stubs/graph-posted-message.stub.ts';
import { MANIFEST_ENTRY_STUB, MANIFEST_FILE_STUB } from '../test/stubs/manifest-entry.stub.ts';
import { withClass } from '../test/utils/class-elements.spec.util.ts';
import { foundReplyOf } from '../test/utils/explain-reply.spec.util.ts';
import { settled, stubElementClass, stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';
import { importsReplyOf } from '../test/utils/imports-reply.spec.util.ts';
import { postedOf } from '../test/utils/posted-messages.spec.util.ts';
import { lastReturnOf } from '../test/utils/spy-return.spec.util.ts';

type PackageSideParts = {
  readonly side: GraphPackageSide;
  readonly modes: ViewStateModes;
};

type DetailsRig = PackageSideDepsMock & PackageSideParts;

const CONTEXT_BEFORE: ManifestContext = { before: '  "dependencies": {' };

const ENTRY_SAME_SHAPE: ManifestEntry = { ...MANIFEST_ENTRY_STUB, spec: '^2.0.0' };

const ENTRY_WITH_CONTEXT: ManifestEntry = { ...MANIFEST_ENTRY_STUB, context: CONTEXT_BEFORE };

/** A `GraphPackageSide`, whose first draw mounts the details panel, over the mocked deps and a saved flat view. */
const detailsRigOf = (): DetailsRig => {
  const mock = packageSideDepsMock();
  const tasks = { onShowTasks: vi.fn(), hasTasks: (): boolean => false };
  const modes = new ViewStateModes(mock.saver, SAVED_FLAT_STUB);
  const frames = new GraphFrames(mock.deps.now);
  const hooks = { frames, modes, tasks, onMessage: mock.onMessage, onPlaced: mock.onPlaced, onLocation: mock.onLocation };
  const side = new GraphPackageSide(mock.deps, mock.view, hooks);
  const rig: DetailsRig = { ...mock, side, modes };

  return rig;
};

const EXPLAIN_WEB_TO_UI = { type: 'explainEdge', source: 'web', target: 'ui' };

const EXPLAIN_TWICE = [EXPLAIN_WEB_TO_UI, EXPLAIN_WEB_TO_UI];

const SCAN_UI_TO_CORE = { type: 'scanImports', source: 'ui', target: 'core' };

const FOUND: EdgeImportsResult = { kind: 'found', scanned: 1, skipped: 0, total: 1, sites: [IMPORT_SITE_STUB], limit: null };

const NONE_SKIPPED: EdgeImportsResult = { kind: 'none', scanned: 3, skipped: 2, limit: null };

const FAILED: EdgeImportsResult = { kind: 'failed' };

const OPEN_A_TS_LINE_3 = { type: 'openImport', packageName: 'web', file: 'src/a.ts', line: 3 };

const SCANNING: ImportsState = { kind: 'scanning' };

const FOUND_FRESH: ImportsState = { ...FOUND, isRefreshing: false };

const FOUND_STALE: ImportsState = { ...FOUND, isRefreshing: true };

const NONE_FRESH: ImportsState = { ...NONE_SKIPPED, isRefreshing: false };

const REPLY_ROWS = [
  { label: 'a found reply', result: FOUND, state: FOUND_FRESH },
  { label: 'a none reply with skipped 2', result: NONE_SKIPPED, state: NONE_FRESH },
  { label: 'a failed reply', result: FAILED, state: FAILED }
];

const SELECT_WEB: InspectionInput = { kind: 'select', name: 'web', via: 'list' };

const TAP_BUNDLE_WEB_TO_UI: InspectionInput = { kind: 'tapBundle', source: 'web', target: 'ui' };

const NON_LINK_ROWS = [
  { label: 'web is selected', input: SELECT_WEB, kind: 'package' },
  { label: 'the web to ui bundle is tapped', input: TAP_BUNDLE_WEB_TO_UI, kind: 'bundle' }
];

const NEW_HASH_STATE = { ...STATE_STUB, hash: 'h2' };

const NO_EDGES_STATE = { ...NEW_HASH_STATE, edges: [] };

/** The `LinkLookups` the last `built` call ran on, read through the prototype spy (spec OQ7). */
const lookupsOf = (built: MockInstance<LinkLookups['built']>): LinkLookups => {
  const context = built.mock.contexts.at(-1);

  if (!(context instanceof LinkLookups)) throw new Error('built was never called on a LinkLookups');

  return context;
};

describe('FEATURE: LinkLookups', () => {
  let rig: DetailsRig;
  let built: MockInstance<LinkLookups['built']>;
  let explain: Mock<DetailsViews['explain']>;
  let link: Mock<DetailsViews['link']>;
  let imports: Mock<DetailsViews['imports']>;

  const tapWebToUi = (): void => {
    rig.side.filtering.inspection.input({ kind: 'tapLink', source: 'web', target: 'ui' });
  };

  const tapUiToCore = (): void => {
    rig.side.filtering.inspection.input({ kind: 'tapLink', source: 'ui', target: 'core' });
  };

  const importsState = (): ImportsState | null => lookupsOf(built).importsState();

  beforeEach(async () => {
    stubPackageSideGlobals();
    built = vi.spyOn(LinkLookups.prototype, 'built');
    rig = detailsRigOf();
    explain = vi.spyOn(rig.deps.views, 'explain');
    link = vi.spyOn(rig.deps.views, 'link');
    imports = vi.spyOn(rig.deps.views, 'imports');
    rig.side.show(STATE_STUB, 1);
    await settled();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GIVEN a drawn graph', () => {
    describe('WHEN a link is tapped', () => {
      beforeEach(() => {
        tapWebToUi();
      });

      it('THEN explainEdge then scanImports are posted for it', () => {
        expect(postedOf(rig, 'explainEdge', 'scanImports')).toStrictEqual([EXPLAIN_WEB_TO_UI, SCAN_WEB_TO_UI_STUB]);
      });

      it('THEN the imports are scanning', () => {
        expect(importsState()).toStrictEqual(SCANNING);
      });

      it('THEN the link view slot holds one imports block', () => {
        const blocks = withClass(lastReturnOf(link).imports, 'details-imports-block');

        expect(blocks).toHaveLength(1);
      });

      it('THEN the imports block is drawn once, as scanning', () => {
        const scanning = imports.mock.calls.map(([model]) => model.isScanning);

        expect(scanning).toStrictEqual([true]);
      });
    });

    it('WHEN a package is selected THEN no explainEdge or scanImports is posted', () => {
      rig.side.filtering.inspection.input({ kind: 'select', name: 'web', via: 'list' });

      expect(postedOf(rig, 'explainEdge', 'scanImports')).toStrictEqual([]);
    });

    it('WHEN a package is selected THEN no imports are held', () => {
      rig.side.filtering.inspection.input({ kind: 'select', name: 'web', via: 'list' });

      expect(importsState()).toBeNull();
    });
  });

  describe('GIVEN a link shown', () => {
    beforeEach(() => {
      tapWebToUi();
    });

    it.each(REPLY_ROWS)('WHEN $label for it arrives THEN the imports state is settled from it', ({ result, state }) => {
      rig.side.filtering.inspection.replied(importsReplyOf('web', 'ui', result));

      expect(importsState()).toStrictEqual(state);
    });

    it('WHEN a reply for another link arrives THEN the imports stay scanning', () => {
      rig.side.filtering.inspection.replied(importsReplyOf('ui', 'core', FOUND));

      expect(importsState()).toStrictEqual(SCANNING);
    });

    it('WHEN a found reply for another link and then one for it arrive THEN the block is drawn again for it only', () => {
      rig.side.filtering.inspection.replied(importsReplyOf('ui', 'core', FOUND));
      rig.side.filtering.inspection.replied(importsReplyOf('web', 'ui', FOUND));

      expect(imports.mock.calls.map(([model]) => model.heading)).toStrictEqual(['Imports of ui', 'Imports of ui (1)']);
    });

    it('WHEN the ask got no reply and a same-hash state arrives and then one found reply THEN the imports are found', () => {
      rig.side.show(STATE_STUB, 2);
      rig.side.filtering.inspection.replied(importsReplyOf('web', 'ui', FOUND));

      expect(postedOf(rig, 'scanImports')).toHaveLength(2);
      expect(importsState()).toStrictEqual(FOUND_FRESH);
    });

    describe('WHEN a new hash drops the edge and a found reply for the link arrives', () => {
      beforeEach(async () => {
        rig.side.show(NO_EDGES_STATE, 2);
        await settled();
        rig.side.filtering.inspection.replied(importsReplyOf('web', 'ui', FOUND));
      });

      it('THEN the last view built is not a link, so the reply was dropped and no imports are held', () => {
        const [inspection] = built.mock.calls.at(-1) ?? [];

        expect(inspection?.kind).not.toBe('link');
        expect(importsState()).toBeNull();
      });

      it('THEN scanImports was posted only once', () => {
        expect(postedOf(rig, 'scanImports')).toStrictEqual([SCAN_WEB_TO_UI_STUB]);
      });
    });

    it('WHEN a same-hash state arrives THEN explainEdge is posted again for it', () => {
      rig.side.show(STATE_STUB, 2);

      expect(postedOf(rig, 'explainEdge')).toStrictEqual(EXPLAIN_TWICE);
    });

    it('WHEN a found reply for it arrives THEN the explain block is built once with the found state', () => {
      rig.side.filtering.inspection.replied(foundReplyOf('web', 'ui', MANIFEST_ENTRY_STUB));

      expect(explain).toHaveBeenCalledTimes(1);
      expect(explain).toHaveBeenCalledWith({ kind: 'found', file: MANIFEST_FILE_STUB, entries: [MANIFEST_ENTRY_STUB] });
    });

    it('WHEN a second found reply of the same shape arrives THEN the block is updated in place', () => {
      rig.side.filtering.inspection.replied(foundReplyOf('web', 'ui', MANIFEST_ENTRY_STUB));
      rig.side.filtering.inspection.replied(foundReplyOf('web', 'ui', ENTRY_SAME_SHAPE));

      expect(explain).toHaveBeenCalledTimes(1);
    });

    it('WHEN a reply for another link arrives THEN the block is not built', () => {
      rig.side.filtering.inspection.replied(foundReplyOf('ui', 'core', MANIFEST_ENTRY_STUB));

      expect(explain).not.toHaveBeenCalled();
    });

    describe('WHEN a new hash keeps the link and the same reply arrives again', () => {
      beforeEach(async () => {
        rig.side.filtering.inspection.replied(foundReplyOf('web', 'ui', MANIFEST_ENTRY_STUB));
        rig.side.show(NEW_HASH_STATE, 2);
        await settled();
        rig.side.filtering.inspection.replied(foundReplyOf('web', 'ui', MANIFEST_ENTRY_STUB));
      });

      it('THEN explainEdge is posted again for it', () => {
        expect(postedOf(rig, 'explainEdge')).toStrictEqual(EXPLAIN_TWICE);
      });

      it('THEN scanImports is posted again for it', () => {
        expect(postedOf(rig, 'scanImports')).toStrictEqual([SCAN_WEB_TO_UI_STUB, SCAN_WEB_TO_UI_STUB]);
      });

      it('THEN the explain block is built again', () => {
        expect(explain).toHaveBeenCalledTimes(2);
      });
    });

    it('WHEN focus is in the explain block and a reply of another shape arrives THEN the heading takes the focus', () => {
      rig.side.filtering.inspection.replied(foundReplyOf('web', 'ui', MANIFEST_ENTRY_STUB));

      const [first] = lastReturnOf(explain).entries;
      const { heading } = lastReturnOf(link);

      if (!first) throw new Error('the found reply built no entry row');

      first.open.focus();
      rig.side.filtering.inspection.replied(foundReplyOf('web', 'ui', ENTRY_WITH_CONTEXT));

      expect(document.activeElement).toBe(heading);
    });
  });

  describe('GIVEN a found reply held for the link', () => {
    beforeEach(() => {
      tapWebToUi();
      rig.side.filtering.inspection.replied(importsReplyOf('web', 'ui', FOUND));
    });

    describe('WHEN a same-hash state arrives', () => {
      beforeEach(() => {
        rig.side.show(STATE_STUB, 2);
      });

      it('THEN scanImports is posted again', () => {
        expect(postedOf(rig, 'scanImports')).toStrictEqual([SCAN_WEB_TO_UI_STUB, SCAN_WEB_TO_UI_STUB]);
      });

      it('THEN the list is marked refreshing', () => {
        expect(importsState()).toStrictEqual(FOUND_STALE);
      });
    });

    it('WHEN its Scan again is clicked THEN scanImports alone is posted again', () => {
      stubElementClass();
      lastReturnOf(imports).scanAgain.click();

      expect(postedOf(rig, 'explainEdge', 'scanImports')).toStrictEqual([EXPLAIN_WEB_TO_UI, SCAN_WEB_TO_UI_STUB, SCAN_WEB_TO_UI_STUB]);
    });

    it('WHEN its row is clicked THEN openImport is posted for src/a.ts at the 0-based line 3', () => {
      stubElementClass();
      lastReturnOf(imports).rows[0]?.button.click();

      expect(postedOf(rig, 'openImport')).toStrictEqual([OPEN_A_TS_LINE_3]);
    });

    it('WHEN another link is tapped THEN the imports are scanning, not the held list marked refreshing', () => {
      tapUiToCore();

      expect(importsState()).toStrictEqual(SCANNING);
    });

    it('WHEN a new hash keeps the link THEN the imports are scanning, not the held list marked refreshing', async () => {
      rig.side.show(NEW_HASH_STATE, 2);
      await settled();

      expect(importsState()).toStrictEqual(SCANNING);
    });

    describe.each(NON_LINK_ROWS)('WHEN $label', ({ input, kind }) => {
      beforeEach(() => {
        rig.side.filtering.inspection.input(input);
      });

      it('THEN the last view built is not a link', () => {
        expect(built.mock.lastCall?.[0].kind).toBe(kind);
      });

      it('THEN no imports are held', () => {
        expect(importsState()).toBeNull();
      });
    });
  });

  describe('GIVEN a failed reply held for the link', () => {
    beforeEach(() => {
      tapWebToUi();
      rig.side.filtering.inspection.replied(importsReplyOf('web', 'ui', FAILED));
    });

    it('WHEN a same-hash state arrives THEN the imports are scanning again', () => {
      rig.side.show(STATE_STUB, 2);

      expect(importsState()).toStrictEqual(SCANNING);
    });
  });

  describe('GIVEN web to ui, ui to core, web to ui tapped with no reply to the aborted scans, and a found reply for web to ui', () => {
    beforeEach(() => {
      tapWebToUi();
      tapUiToCore();
      tapWebToUi();
      rig.side.filtering.inspection.replied(importsReplyOf('web', 'ui', FOUND));
    });

    it('THEN scanImports was posted three times in order', () => {
      expect(postedOf(rig, 'scanImports')).toStrictEqual([SCAN_WEB_TO_UI_STUB, SCAN_UI_TO_CORE, SCAN_WEB_TO_UI_STUB]);
    });

    it('THEN the imports are found for web to ui', () => {
      expect(importsState()).toStrictEqual(FOUND_FRESH);
    });

    it('WHEN a late reply for ui to core arrives THEN the held state is the same object', () => {
      const held = importsState();

      rig.side.filtering.inspection.replied(importsReplyOf('ui', 'core', FOUND));

      expect(importsState()).toBe(held);
    });
  });

  describe('GIVEN a package shown', () => {
    it('WHEN a reply for a link arrives THEN the block is not built', () => {
      rig.side.filtering.inspection.input({ kind: 'select', name: 'web', via: 'list' });
      rig.side.filtering.inspection.replied(foundReplyOf('web', 'ui', MANIFEST_ENTRY_STUB));

      expect(explain).not.toHaveBeenCalled();
    });
  });
});
