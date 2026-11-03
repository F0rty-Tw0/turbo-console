import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphFrames } from './graph-frames.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { SAVED_FLAT_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { BARE_HIDDEN_STUB, BARE_LABELS_STUB, BARE_SHOWN_STUB } from '../test/stubs/scope-labels.stub.ts';
import { settled, stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

type RelabelSide = {
  readonly side: GraphPackageSide;
};

type RelabelRig = PackageSideDepsMock & RelabelSide;

/** A `GraphPackageSide` over the mocked deps, its view modes starting flat, in a project with no task. */
const rigOf = (): RelabelRig => {
  const mock = packageSideDepsMock();
  const tasks = { onShowTasks: vi.fn(), hasTasks: (): boolean => false };
  const modes = new ViewStateModes(mock.saver, SAVED_FLAT_STUB);
  const frames = new GraphFrames(mock.deps.now);
  const hooks = { frames, modes, tasks, onMessage: mock.onMessage, onPlaced: mock.onPlaced, onLocation: mock.onLocation };
  const side = new GraphPackageSide(mock.deps, mock.view, hooks);
  const rig: RelabelRig = { ...mock, side };

  return rig;
};

const scopeBoxOf = (rig: RelabelRig): HTMLInputElement => {
  const scope = rig.side.filtering.controls.mounted?.elements.scope;

  if (scope === undefined) throw new Error('no mounted Controls');

  return scope;
};

const togglesPostedBy = (rig: RelabelRig): unknown[] => {
  const posted = vi.mocked(rig.deps.bridge.post).mock.calls.map(([message]) => message);

  return posted.filter((message) => message.type === 'setViewToggle');
};

describe('FEATURE: GraphPackageSide relabel', () => {
  let rig: RelabelRig;

  const scopeBox = (): HTMLInputElement => scopeBoxOf(rig);
  const togglesPosted = (): unknown[] => togglesPostedBy(rig);

  beforeEach(() => {
    stubPackageSideGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN h1 drawn with scopes shown, then h1 again with scopes hidden', () => {
    let fitsBefore: number;
    let postsBefore: number;

    beforeEach(async () => {
      rig = rigOf();
      rig.side.show(BARE_SHOWN_STUB, 1);
      await settled();
      fitsBefore = rig.view.fit.mock.calls.length;
      postsBefore = vi.mocked(rig.deps.bridge.post).mock.calls.length;
      rig.side.show(BARE_HIDDEN_STUB, 2);
      await settled();
    });

    it('WHEN nothing else happens THEN the view is relabelled with the bare names', () => {
      expect(rig.view.setLabels).toHaveBeenLastCalledWith(BARE_LABELS_STUB);
    });

    it('WHEN nothing else happens THEN no layout runs, setGraph ran once, and no fit or post was added', () => {
      const counts = [rig.view.fit.mock.calls.length, vi.mocked(rig.deps.bridge.post).mock.calls.length];

      expect([rig.runs.count(), rig.view.setGraph.mock.calls.length, ...counts]).toStrictEqual([0, 1, fitsBefore, postsBefore]);
    });

    it('WHEN nothing else happens THEN the Controls rows read the bare names', () => {
      const groups = rig.side.filtering.controls.mounted?.elements.groups ?? [];
      const texts = groups.flatMap((group) => group.rows).map((row) => row.pick.textContent);

      expect(texts.toSorted()).toStrictEqual(['bare-core', 'bare-ui', 'bare-web']);
    });

    it('WHEN the user types in the Controls search THEN the search reads the relabelled graph', () => {
      const { controls } = rig.side.filtering;
      const setSearch = vi.spyOn(controls, 'setSearch');

      controls.mounted?.elements.search.dispatchEvent(new Event('input'));

      const searched = setSearch.mock.lastCall?.[0].graph;

      expect(searched).toBe(rig.side.drawnGraph());
    });

    it('WHEN the host answer left the box unticked THEN no setViewToggle was posted', () => {
      expect([scopeBox().checked, togglesPosted()]).toStrictEqual([false, []]);
    });

    it('WHEN the user ticks the box THEN one setViewToggle scope true is posted', () => {
      scopeBox().checked = true;
      scopeBox().dispatchEvent(new Event('input'));

      expect(togglesPosted()).toStrictEqual([{ type: 'setViewToggle', toggle: 'scope', shown: true }]);
    });

    it('WHEN h2 is drawn next THEN its nodes are labelled with the bare names after they are set', async () => {
      rig.side.show({ ...BARE_HIDDEN_STUB, hash: 'h2' }, 3);
      await settled();
      const lastLabels = Math.max(...rig.view.setLabels.mock.invocationCallOrder);
      const lastGraph = Math.max(...rig.view.setGraph.mock.invocationCallOrder);

      expect([lastLabels > lastGraph, rig.view.setLabels.mock.lastCall?.[0]]).toStrictEqual([true, BARE_LABELS_STUB]);
    });
  });
});
