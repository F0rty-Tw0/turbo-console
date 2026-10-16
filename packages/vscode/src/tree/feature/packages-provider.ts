import * as vscode from 'vscode';

import { toTreeItem } from './tree-item.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { RunLookup } from '../../run/common/run.type.ts';
import type { Span } from '../../shared/common/span.type.ts';
import type { PackagesTreeApi, TreeNode, TreePorts } from '../common/tree-node.type.ts';
import type { TreeMode } from '../common/tree-row.type.ts';
import { PackagesTree } from '../domain-logic/packages-tree.ts';

/**
 * The Packages view's data provider: `PackagesTree` decides the nodes, their rows and what to refresh; this class turns
 * rows into items and refreshes into `onDidChangeTreeData` events. `runs` is the one run lookup every row reads.
 */
export class PackagesTreeProvider implements vscode.TreeDataProvider<TreeNode>, PackagesTreeApi, vscode.Disposable {
  public readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined>;
  private readonly emitter = new vscode.EventEmitter<TreeNode | undefined>();
  private readonly tree: PackagesTree;

  public constructor(store: Roots, runs: RunLookup, mode: TreeMode, treeVisible: Map<string, Span>) {
    const fire = (node: TreeNode | undefined): void => {
      this.emitter.fire(node);
    };
    const ports: TreePorts = { runs, fire, treeVisible, now: () => performance.now(), wallNow: () => Date.now() };

    this.onDidChangeTreeData = this.emitter.event;
    this.tree = new PackagesTree(store, mode, ports);
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

  public setScopeShown(value: boolean): void {
    this.tree.setScopeShown(value);
  }

  public isScopeShown(): boolean {
    return this.tree.isScopeShown();
  }

  public rootsChanged(): void {
    this.tree.rootsChanged();
  }

  public dispose(): void {
    this.emitter.dispose();
  }
}
