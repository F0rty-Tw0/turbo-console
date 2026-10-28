import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import type { TreePorts } from '../common/tree-node.type.ts';
import type { IconsState } from '../common/tree-row.type.ts';
import { ICONS_STATE_STUB } from '../test/stubs/icons-state.stub.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';

const NAMES = new Set(['vitest.config.ts']);
const THEME_STATE: IconsState = { mode: 'theme', fileNames: NAMES };

describe('FEATURE: icons state of the packages tree', () => {
  describe('GIVEN a tree drawing builtin icons', () => {
    let tree: PackagesTree;
    let fire: TreePorts['fire'];

    beforeEach(() => {
      fire = vi.fn();

      const ports: TreePorts = {
        runs: () => undefined,
        ...SCRIPTS_HIDDEN_PORTS,
        fire,
        treeVisible: new Map(),
        now: () => 7,
        wallNow: () => 7
      };

      tree = new PackagesTree(new RootStore(), 'list', ICONS_STATE_STUB, ports);
    });

    it('WHEN the same theme state is set twice THEN the tree redraws once', () => {
      tree.setIcons(THEME_STATE);
      tree.setIcons(THEME_STATE);

      expect(fire).toHaveBeenCalledOnce();
    });

    it('WHEN the builtin state is set again THEN the tree does not redraw', () => {
      tree.setIcons(ICONS_STATE_STUB);

      expect(fire).not.toHaveBeenCalled();
    });

    it('WHEN theme is set with an equal but new set THEN the tree redraws again', () => {
      const other: IconsState = { mode: 'theme', fileNames: new Set(NAMES) };

      tree.setIcons(THEME_STATE);
      tree.setIcons(other);

      expect(fire).toHaveBeenCalledTimes(2);
    });

    it('WHEN the mode changes with the same set THEN the tree redraws', () => {
      const themed: IconsState = { mode: 'theme', fileNames: ICONS_STATE_STUB.fileNames };

      tree.setIcons(themed);

      expect(fire).toHaveBeenCalledOnce();
    });

    it('WHEN a state is set THEN iconsState reads it back', () => {
      tree.setIcons(THEME_STATE);

      expect(tree.iconsState()).toBe(THEME_STATE);
    });
  });
});
