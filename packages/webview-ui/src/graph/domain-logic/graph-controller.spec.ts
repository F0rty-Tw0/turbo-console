import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphController } from './graph-controller.ts';
import type { GraphPackage, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { LARGE_STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

const ORIGIN: Position = { x: 0, y: 0 };

/** A flat choice saved with a camera the reader rejects, so the whole saved view is dropped. */
const BAD_CAMERA_RAW = { hash: 'h1', zoom: 0, pan: ORIGIN, selected: null, grouped: false };

const entryOf = ({ name }: GraphPackage): [string, Position] => [name, ORIGIN];

const LARGE_ENTRIES: [string, Position][] = LARGE_STATE_STUB.packages.map(entryOf);

const LARGE_POSITIONS: Positions = Object.fromEntries(LARGE_ENTRIES);

describe('FEATURE: createGraphController', () => {
  let mock: PackageSideDepsMock;

  beforeEach(() => {
    stubPackageSideGlobals();
    mock = packageSideDepsMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
});
