import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import type { TreePorts } from '../common/tree-node.type.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';

describe('FEATURE: icons mode of the packages tree', () => {
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

      tree = new PackagesTree(new RootStore(), 'list', 'builtin', ports);
    });

    it('WHEN theme is set twice THEN the tree redraws once', () => {
      tree.setIcons('theme');
      tree.setIcons('theme');

      expect(fire).toHaveBeenCalledOnce();
    });

    it('WHEN builtin is set again THEN the tree does not redraw', () => {
      tree.setIcons('builtin');

      expect(fire).not.toHaveBeenCalled();
    });
  });
});
