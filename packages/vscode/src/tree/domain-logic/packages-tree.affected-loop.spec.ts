import { beforeEach, describe, expect, it } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { sharedAffectedOf } from './shared-affected.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { SharedAffected } from '../common/affected.type.ts';
import type { TreePorts, TreeRefresh } from '../common/tree-node.type.ts';
import type { AffectedHarness } from '../test/common/affected-load.type.ts';
import { ICONS_STATE_STUB } from '../test/stubs/icons-state.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { affectedHarness, readAt } from '../test/utils/affected-load.spec.util.ts';
import { affectedResultOf } from '../test/utils/affected-result.spec.util.ts';
import { flush } from '../test/utils/atom-load.spec.util.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';

/** The real shared affected store and the real tree over one store, and every refresh the tree fired. */
type LoopFixture = {
  readonly h: AffectedHarness;
  readonly shared: SharedAffected;
  readonly tree: PackagesTree;
  readonly fired: TreeRefresh[];
};

const SETTLED = new Date(2026, 10, 11, 14, 5).getTime();

const TASK_A_LINE = 'Affected (task level): file changed, packages/a/src/a.ts (as of 14:05)';

const RESULT = affectedResultOf([['a#build', 'TaskFileChanged', 'packages/a/src/a.ts']]);

/** `sharedAffectedOf` and `PackagesTree` over a `/ws` root holding package a; `fire` acts like VS Code: a redraw asks the top level again, as the single root's whole-tree event does. */
const loopFixtureOf = (): LoopFixture => {
  const h = affectedHarness();
  const store = new RootStore();
  const shared = sharedAffectedOf(store, h.ports);
  const fired: TreeRefresh[] = [];
  const trees: PackagesTree[] = [];
  const fire = (refresh: TreeRefresh): void => {
    fired.push(refresh);

    for (const tree of trees) void tree.children();
  };
  const ports: TreePorts = {
    runs: () => undefined,
    ...SCRIPTS_HIDDEN_PORTS,
    affected: shared,
    fire,
    treeVisible: new Map(),
    now: () => 7,
    wallNow: () => 7
  };
  const tree = new PackagesTree(store, 'list', ICONS_STATE_STUB, ports);

  trees.push(tree);
  store.set([ROOT_FOLDER_STUB], coordinatorMock);
  store.apply('/ws', loadedWith([packageNamed('a')]));
  h.setNow(SETTLED);

  const fixture: LoopFixture = { h, shared, tree, fired };

  return fixture;
};

/** Toggle on, list the top level (which shows the root), let the query settle, let the tree re-ask. */
const showAndSettle = async (fixture: LoopFixture, settle: (h: AffectedHarness) => void): Promise<void> => {
  fixture.shared.toggled(true);
  await fixture.tree.children();
  settle(fixture.h);
  await flush();
  await flush();
};

describe('FEATURE: packages tree affected redraw loop', () => {
  let fixture: LoopFixture;

  beforeEach(() => {
    fixture = loopFixtureOf();
  });

  describe('GIVEN the affected toggle on and the top level listed', () => {
    beforeEach(async () => {
      await showAndSettle(fixture, (h) => {
        readAt(h, 0).resolve(RESULT);
      });
    });

    it('WHEN the query resolves and the redraw re-asks THEN readAffected ran once', () => {
      expect(fixture.h.reads).toHaveLength(1);
    });

    it('WHEN the query resolves THEN the tree redrew the whole tree for loading and for loaded', () => {
      expect(fixture.fired).toStrictEqual([undefined, undefined]);
    });

    it('WHEN the query resolves THEN the store holds the task line with the file last', () => {
      const entry = fixture.shared.view('/ws')?.tasks.get('a#build');

      expect(entry?.line).toBe(TASK_A_LINE);
    });
  });

  describe('GIVEN the query rejects', () => {
    beforeEach(async () => {
      await showAndSettle(fixture, (h) => {
        readAt(h, 0).reject(new Error('boom'));
      });
    });

    it('WHEN the failure redraws and the tree re-asks THEN readAffected still ran once', () => {
      expect(fixture.h.reads).toHaveLength(1);
    });

    it('THEN exactly one Output line starts with "affected /ws:"', () => {
      const lines = fixture.h.log.mock.calls.map(([line]) => line).filter((line) => line.startsWith('affected /ws:'));

      expect(lines).toHaveLength(1);
    });

    it('THEN the root reads as failed with no view', () => {
      expect([fixture.shared.status('/ws'), fixture.shared.view('/ws')]).toStrictEqual(['failed', null]);
    });
  });
});
