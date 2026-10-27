import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphFrames } from './graph-frames.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { ViewStateModes } from './view-state-modes.ts';
import { DETAILS_ID } from '../common/graph.const.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { SAVED_FLAT_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

type PackageSideParts = {
  readonly side: GraphPackageSide;
  readonly modes: ViewStateModes;
};

type DetailsRig = PackageSideDepsMock & PackageSideParts;

/** A `GraphPackageSide`, whose first draw mounts the details panel, over the mocked deps and a saved flat view. */
const rigOf = (): DetailsRig => {
  const mock = packageSideDepsMock();
  const tasks = { onShowTasks: vi.fn(), hasTasks: (): boolean => false };
  const modes = new ViewStateModes(mock.saver, SAVED_FLAT_STUB);
  const frames = new GraphFrames(mock.deps.now);
  const hooks = { frames, modes, tasks, onMessage: mock.onMessage, onPlaced: mock.onPlaced };
  const side = new GraphPackageSide(mock.deps, mock.view, hooks);
  const rig: DetailsRig = { ...mock, side, modes };

  return rig;
};

/** The ids of the page body's children: the details panel's once it is built. */
const bodyIdsOf = (rig: DetailsRig): string[] => Array.from(rig.page.body.children, (child) => child.id);

const settled = async (): Promise<void> => {
  const wait = (resolve: () => void): void => {
    setTimeout(resolve, 0);
  };

  return new Promise(wait);
};

describe('FEATURE: GraphDetails mount', () => {
  let rig: DetailsRig;

  beforeEach(() => {
    stubPackageSideGlobals();
    rig = rigOf();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GIVEN package mode WHEN the first graph draws THEN the panel is built under the Details bar', async () => {
    rig.side.show(STATE_STUB, 1);
    await settled();

    expect(rig.page.body.contains(rig.page.detailsBar)).toBe(true);
  });

  it('GIVEN task mode WHEN the first graph draws THEN the panel is built', async () => {
    rig.modes.setMode('tasks', 'h1');
    rig.side.show(STATE_STUB, 1);
    await settled();

    expect(bodyIdsOf(rig)).toContain(DETAILS_ID);
  });

  it('GIVEN task mode WHEN the first graph draws THEN the Details bar stays out of the panel, held by task mode', async () => {
    rig.modes.setMode('tasks', 'h1');
    rig.side.show(STATE_STUB, 1);
    await settled();

    expect(rig.page.body.contains(rig.page.detailsBar)).toBe(false);
  });
});
