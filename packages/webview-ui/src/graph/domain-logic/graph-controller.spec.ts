import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphController } from './graph-controller.ts';
import { LinkLookups } from './graph-details-lookups.ts';
import type { EdgeImportsResult, GraphEdgeImportsMessage } from '../../bridge/common/graph-imports.type.ts';
import type { GraphPackage, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { LARGE_STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { SINGLE_TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';
import { taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';

const ORIGIN: Position = { x: 0, y: 0 };

/** A flat choice saved with a camera the reader rejects, so the whole saved view is dropped. */
const BAD_CAMERA_RAW = { hash: 'h1', zoom: 0, pan: ORIGIN, selected: null, grouped: false };

const entryOf = ({ name }: GraphPackage): [string, Position] => [name, ORIGIN];

const LARGE_ENTRIES: [string, Position][] = LARGE_STATE_STUB.packages.map(entryOf);

const LARGE_POSITIONS: Positions = Object.fromEntries(LARGE_ENTRIES);

const FAILED_RESULT: EdgeImportsResult = { kind: 'failed' };

/** A result kind the page does not know, as the host never sends it. */
const UNKNOWN_RESULT = { kind: 'done' };

const IMPORTS_FAILED: GraphEdgeImportsMessage = { type: 'edgeImports', source: 'web', target: 'ui', result: FAILED_RESULT };

const IMPORTS_UNKNOWN_KIND = { ...IMPORTS_FAILED, result: UNKNOWN_RESULT };

describe('FEATURE: createGraphController', () => {
  let mock: PackageSideDepsMock;

  beforeEach(() => {
    stubPackageSideGlobals();
    mock = packageSideDepsMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GIVEN no link shown', () => {
    it('WHEN a valid edgeImports arrives THEN the link look-ups are handed it once', () => {
      const replied = vi.spyOn(LinkLookups.prototype, 'replied');
      const controller = createGraphController(mock.deps);

      controller.receive(IMPORTS_FAILED);

      expect(replied).toHaveBeenCalledTimes(1);
      expect(replied.mock.calls[0]?.[0]).toStrictEqual(IMPORTS_FAILED);
    });

    it('WHEN an edgeImports with an unknown result kind arrives THEN the look-ups are not handed it', () => {
      const replied = vi.spyOn(LinkLookups.prototype, 'replied');
      const controller = createGraphController(mock.deps);

      controller.receive(IMPORTS_UNKNOWN_KIND);

      expect(replied).not.toHaveBeenCalled();
    });
  });

  it('GIVEN a grouping choice saved with a bad camera WHEN a large graph is laid out THEN its folder opens collapsed', async () => {
    vi.mocked(mock.deps.bridge.savedState).mockReturnValue(BAD_CAMERA_RAW);
    const controller = createGraphController(mock.deps);
    const result = resultOf('h1', LARGE_POSITIONS);

    controller.receive({ type: 'state', state: LARGE_STATE_STUB });
    await mock.runs.settle(0, result);
    const scene = mock.view.showFolders.mock.lastCall?.[0];

    expect(controller.facts.grouped()).toBe(true);
    expect(scene?.collapsed).toStrictEqual(new Set(['apps']));
  });

  describe('GIVEN a restored panel whose saved view says packages', () => {
    beforeEach(() => {
      vi.mocked(mock.deps.bridge.savedState).mockReturnValue(taskSavedOf({}, 'packages'));
    });

    it('WHEN a single-package state arrives THEN task mode is on, the mode group is hidden and no package graph is drawn', () => {
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'state', state: SINGLE_TASK_STATE_STUB });
      const hidden = [mock.page.modeGroup.hidden, mock.page.modeEnd.hidden];

      expect(mock.page.taskMode.getAttribute('aria-pressed')).toBe('true');
      expect(hidden).toStrictEqual([true, true]);
      expect(mock.view.setGraph).not.toHaveBeenCalled();
    });

    it('WHEN a monorepo state arrives THEN the mode group shows and task mode stays off', () => {
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'state', state: LARGE_STATE_STUB });
      const hidden = [mock.page.modeGroup.hidden, mock.page.modeEnd.hidden];

      expect(mock.page.taskMode.getAttribute('aria-pressed')).toBe('false');
      expect(hidden).toStrictEqual([false, false]);
    });
  });
});
