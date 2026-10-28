import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { LiveIds } from '../../run/common/run.type.ts';
import type { ScriptsToggleFake } from '../../shared/test/common/scripts-toggle-fake.type.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { TreePorts } from '../common/tree-node.type.ts';
import { ICONS_STATE_STUB } from '../test/stubs/icons-state.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { SHARED_ATOMS_STUB } from '../test/stubs/shared-atoms.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';
import { SCRIPT_PACKAGE, SCRIPT_TASK, scriptRunOf } from '../test/utils/tree-refresher.spec.util.ts';

const LIVE: ReadonlySet<string> = new Set([SCRIPT_TASK.id]);

const NOBODY: ReadonlySet<string> = new Set();

describe('FEATURE: packages tree scripts toggle and run membership', () => {
  let tree: PackagesTree;
  let toggle: ScriptsToggleFake;
  let fire: Mock<TreePorts['fire']>;
  let live: ReadonlySet<string>;

  beforeEach(() => {
    const store = new RootStore();
    const runningIds: LiveIds = () => live;

    live = NOBODY;
    toggle = scriptsToggleMock(true);
    fire = vi.fn<TreePorts['fire']>();

    const scriptsShown = (): boolean => toggle.isShown();
    const ports: TreePorts = {
      runs: () => undefined,
      scriptsShown,
      runningIds,
      fire,
      treeVisible: new Map(),
      now: () => 7,
      wallNow: () => 7,
      atom: SHARED_ATOMS_STUB
    };

    tree = new PackagesTree(store, 'list', ICONS_STATE_STUB, ports);
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply('/ws', loadedWith([packageNamed('a'), SCRIPT_PACKAGE]));
    toggle.onDidChange(() => {
      tree.scriptsChanged();
    });
  });

  describe('GIVEN a script run the tree never heard of, live while scripts are shown', () => {
    beforeEach(async () => {
      live = LIVE;
      await toggle.set(false);
      fire.mockClear();
      live = NOBODY;
    });

    it('WHEN scripts are hidden and the run ends THEN the whole tree is redrawn', () => {
      tree.runChanged(scriptRunOf('/ws', { state: 'stopped', endedAt: 2000 }));

      expect(fire).toHaveBeenCalledWith(undefined);
    });
  });
});
