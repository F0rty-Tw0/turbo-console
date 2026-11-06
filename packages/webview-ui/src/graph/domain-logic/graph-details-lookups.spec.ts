import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphFrames } from './graph-frames.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type {
  EdgeExplainResult,
  GraphEdgeExplainedMessage,
  ManifestContext,
  ManifestEntry
} from '../../bridge/common/graph-message.type.ts';
import type { DetailsViews } from '../common/details.type.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { SAVED_FLAT_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { postedOf } from '../test/utils/graph-details.spec.util.ts';
import { settled, stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

type PackageSideParts = {
  readonly side: GraphPackageSide;
  readonly modes: ViewStateModes;
};

type DetailsRig = PackageSideDepsMock & PackageSideParts;

const FILE = 'apps/web/package.json';

const NO_CONTEXT: ManifestContext = {};

const CONTEXT_BEFORE: ManifestContext = { before: '  "dependencies": {' };

const ENTRY: ManifestEntry = { field: 'dependencies', key: 'ui', spec: '^1.0.0', line: 2, context: NO_CONTEXT };

const ENTRY_SAME_SHAPE: ManifestEntry = { ...ENTRY, spec: '^2.0.0' };

const ENTRY_WITH_CONTEXT: ManifestEntry = { ...ENTRY, context: CONTEXT_BEFORE };

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

const foundReplyOf = (source: string, target: string, entry: ManifestEntry): GraphEdgeExplainedMessage => {
  const result: EdgeExplainResult = { kind: 'found', file: FILE, entries: [entry] };
  const message: GraphEdgeExplainedMessage = { type: 'edgeExplained', source, target, result };

  return message;
};

const WEB_TO_UI_POSTED = [{ type: 'explainEdge', source: 'web', target: 'ui' }];

/** What `spy` returned on its latest call; throws when it has not returned yet. */
const lastReturnOf = <Result>(spy: Mock<(...args: never[]) => Result>): Result => {
  const last = spy.mock.results.at(-1);

  if (last?.type !== 'return') throw new Error('the spy has not returned yet');

  return last.value;
};

describe('FEATURE: GraphDetails link look-ups', () => {
  let rig: DetailsRig;
  let explain: Mock<DetailsViews['explain']>;
  let link: Mock<DetailsViews['link']>;

  const tapWebToUi = (): void => {
    rig.side.filtering.inspection.input({ kind: 'tapLink', source: 'web', target: 'ui' });
  };

  beforeEach(async () => {
    stubPackageSideGlobals();
    rig = detailsRigOf();
    explain = vi.spyOn(rig.deps.views, 'explain');
    link = vi.spyOn(rig.deps.views, 'link');
    rig.side.show(STATE_STUB, 1);
    await settled();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GIVEN a drawn graph', () => {
    it('WHEN a link is tapped THEN explainEdge is posted once for it', () => {
      tapWebToUi();

      expect(postedOf(rig, 'explainEdge')).toStrictEqual(WEB_TO_UI_POSTED);
    });

    it('WHEN a package is selected THEN no explainEdge is posted', () => {
      rig.side.filtering.inspection.input({ kind: 'select', name: 'web', via: 'list' });

      expect(postedOf(rig, 'explainEdge')).toStrictEqual([]);
    });
  });

  describe('GIVEN a link shown', () => {
    beforeEach(() => {
      tapWebToUi();
    });

    it('WHEN a same-hash state arrives THEN explainEdge is posted again for it', () => {
      rig.side.show(STATE_STUB, 2);

      expect(postedOf(rig, 'explainEdge')).toStrictEqual([...WEB_TO_UI_POSTED, ...WEB_TO_UI_POSTED]);
    });

    it('WHEN a found reply for it arrives THEN the explain block is built once with the found state', () => {
      rig.side.filtering.inspection.explained(foundReplyOf('web', 'ui', ENTRY));

      expect(explain).toHaveBeenCalledTimes(1);
      expect(explain).toHaveBeenCalledWith({ kind: 'found', file: FILE, entries: [ENTRY] });
    });

    it('WHEN a second found reply of the same shape arrives THEN the block is updated in place', () => {
      rig.side.filtering.inspection.explained(foundReplyOf('web', 'ui', ENTRY));
      rig.side.filtering.inspection.explained(foundReplyOf('web', 'ui', ENTRY_SAME_SHAPE));

      expect(explain).toHaveBeenCalledTimes(1);
    });

    it('WHEN a reply for another link arrives THEN the block is not built', () => {
      rig.side.filtering.inspection.explained(foundReplyOf('ui', 'core', ENTRY));

      expect(explain).not.toHaveBeenCalled();
    });

    it('WHEN a new hash keeps the link and the same reply arrives again THEN it is asked again and the block is built again', async () => {
      rig.side.filtering.inspection.explained(foundReplyOf('web', 'ui', ENTRY));
      rig.side.show({ ...STATE_STUB, hash: 'h2' }, 2);
      await settled();
      rig.side.filtering.inspection.explained(foundReplyOf('web', 'ui', ENTRY));

      expect(postedOf(rig, 'explainEdge')).toStrictEqual([...WEB_TO_UI_POSTED, ...WEB_TO_UI_POSTED]);
      expect(explain).toHaveBeenCalledTimes(2);
    });

    it('WHEN focus is in the explain block and a reply of another shape arrives THEN the heading takes the focus', () => {
      rig.side.filtering.inspection.explained(foundReplyOf('web', 'ui', ENTRY));

      const [first] = lastReturnOf(explain).entries;

      first?.open.focus();
      rig.side.filtering.inspection.explained(foundReplyOf('web', 'ui', ENTRY_WITH_CONTEXT));

      expect(document.activeElement).toBe(lastReturnOf(link).heading);
    });
  });

  describe('GIVEN a package shown', () => {
    it('WHEN a reply for a link arrives THEN the block is not built', () => {
      rig.side.filtering.inspection.input({ kind: 'select', name: 'web', via: 'list' });
      rig.side.filtering.inspection.explained(foundReplyOf('web', 'ui', ENTRY));

      expect(explain).not.toHaveBeenCalled();
    });
  });
});
