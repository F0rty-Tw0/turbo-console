import { vi } from 'vitest';
import type { Disposable } from 'vscode';

import type { PackagesTreeApi } from '../../common/tree-node.type.ts';

const disposableFake = (): Disposable => {
  const disposable: Disposable = { dispose: vi.fn() };

  return disposable;
};

/** A `PackagesTreeApi` whose every member is a spy; `setScopeShown` is the one a spec reads back. */
export const packagesTreeApiMock = (): PackagesTreeApi => {
  const tree: PackagesTreeApi = {
    onDidChangeTreeData: vi.fn(disposableFake),
    getChildren: vi.fn(async () => Promise.resolve([])),
    getTreeItem: vi.fn(),
    refreshFor: vi.fn(),
    setMode: vi.fn(),
    refreshTask: vi.fn(),
    runChanged: vi.fn(),
    refreshTasks: vi.fn(),
    setScopeShown: vi.fn(),
    isScopeShown: vi.fn(() => false),
    isScriptsShown: vi.fn(() => false)
  };

  return tree;
};
