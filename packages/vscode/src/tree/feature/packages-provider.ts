import * as vscode from 'vscode';

import { toTreeItem } from './tree-item.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import type { PackagesTreeApi, RunningTasks, TreeNode, TreePorts, TreeProviderDeps, TreeRefresh } from '../common/tree-node.type.ts';
import type { TreeMode } from '../common/tree-row.type.ts';
import { PackagesTree } from '../domain-logic/packages-tree.ts';

/**
 * The Packages view's data provider: `PackagesTree` decides the nodes, their rows and what to refresh; this class turns
 * rows into items and refreshes into `onDidChangeTreeData` events. `deps.runs` is the one run lookup every row reads; a
 * change of `deps.scripts` redraws the tree.
 */
export class PackagesTreeProvider implements vscode.TreeDataProvider<TreeNode>, PackagesTreeApi, vscode.Disposable {
  public readonly onDidChangeTreeData: vscode.Event<TreeRefresh>;
  private readonly emitter = new vscode.EventEmitter<TreeRefresh>();
  private readonly tree: PackagesTree;
  private readonly scripts: ScriptsToggleApi;
  private readonly unsubscribe: () => void;

  public constructor(store: Roots, mode: TreeMode, deps: TreeProviderDeps) {
    const fire = (refresh: TreeRefresh): void => {
      this.emitter.fire(refresh);
    };
    const { runs, treeVisible, scripts } = deps;
    const scriptsShown = (): boolean => scripts.isShown();
    const ports: TreePorts = {
      runs: runs.get,
      scriptsShown,
      runningIds: runs.runningIds,
      fire,
      treeVisible,
      now: () => performance.now(),
      wallNow: () => Date.now()
    };

    this.onDidChangeTreeData = this.emitter.event;
    this.tree = new PackagesTree(store, mode, ports);
    this.scripts = scripts;
    this.unsubscribe = scripts.onDidChange(() => {
      this.tree.scriptsChanged();
    });
  }

  public async getChildren(node?: TreeNode): Promise<TreeNode[]> {
    return this.tree.children(node);
  }

  public getTreeItem(node: TreeNode): vscode.TreeItem {
    const row = this.tree.rowOf(node);

    return toTreeItem(row);
  }

  public refreshFor(change: RootChange): void {
    this.tree.refreshFor(change);
  }

  public setMode(mode: TreeMode): void {
    this.tree.setMode(mode);
  }

  public refreshTask(root: string, taskId: string): void {
    this.tree.refreshTask(root, taskId);
  }

  public refreshTasks(running: RunningTasks): void {
    this.tree.refreshTasks(running);
  }

  public setScopeShown(value: boolean): void {
    this.tree.setScopeShown(value);
  }

  public isScopeShown(): boolean {
    return this.tree.isScopeShown();
  }

  public isScriptsShown(): boolean {
    return this.scripts.isShown();
  }

  public rootsChanged(): void {
    this.tree.rootsChanged();
  }

  public dispose(): void {
    this.unsubscribe();
    this.emitter.dispose();
  }
}
