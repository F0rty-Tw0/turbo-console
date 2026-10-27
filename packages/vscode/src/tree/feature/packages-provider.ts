import * as vscode from 'vscode';

import { toTreeItem } from './tree-item.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import type { ContextKeyTracker } from '../common/context-key.type.ts';
import type { PackagesTreeApi, RunningTasks, TreeNode, TreePorts, TreeProviderDeps, TreeRefresh } from '../common/tree-node.type.ts';
import type { IconsMode, TreeMode } from '../common/tree-row.type.ts';
import { PackagesTree } from '../domain-logic/packages-tree.ts';
import { trackRootsKey } from '../domain-logic/roots-key.ts';
import { hasScriptsOf } from '../utils/has-scripts.util.ts';
import { isSinglePackageWindow } from '../utils/single-package-key.util.ts';

/**
 * The Packages view's data provider: `PackagesTree` decides the nodes, their rows and what to refresh; this class turns
 * rows into items and refreshes into `onDidChangeTreeData` events. `deps.runs` is the one run lookup every row reads; a
 * change of `deps.scripts` redraws the tree. It also sends `turboConsole.hasScripts` (it shows the Scripts toggle) through
 * `deps.setHasScripts` and `turboConsole.singlePackage` (it hides Show Package Graph) through `deps.setSinglePackage`, now,
 * after every model change and after every `rootsChanged`.
 */
export class PackagesTreeProvider implements vscode.TreeDataProvider<TreeNode>, PackagesTreeApi, vscode.Disposable {
  public readonly onDidChangeTreeData: vscode.Event<TreeRefresh>;
  private readonly emitter = new vscode.EventEmitter<TreeRefresh>();
  private readonly tree: PackagesTree;
  private readonly scripts: ScriptsToggleApi;
  private readonly unsubscribe: () => void;
  private readonly hasScripts: ContextKeyTracker;
  private readonly singlePackage: ContextKeyTracker;

  public constructor(store: Roots, mode: TreeMode, icons: IconsMode, deps: TreeProviderDeps) {
    const fire = (refresh: TreeRefresh): void => {
      this.emitter.fire(refresh);
    };
    const { runs, treeVisible, scripts, atom, setHasScripts, setSinglePackage, log } = deps;
    const scriptsShown = (): boolean => scripts.isShown();
    const ports: TreePorts = {
      runs: runs.get,
      scriptsShown,
      runningIds: runs.runningIds,
      fire,
      treeVisible,
      now: () => performance.now(),
      wallNow: () => Date.now(),
      atom
    };

    this.onDidChangeTreeData = this.emitter.event;
    this.tree = new PackagesTree(store, mode, icons, ports);
    this.scripts = scripts;
    this.unsubscribe = scripts.onDidChange(() => {
      this.tree.scriptsChanged();
    });
    this.hasScripts = trackRootsKey(store, hasScriptsOf, setHasScripts, log);
    this.singlePackage = trackRootsKey(store, isSinglePackageWindow, setSinglePackage, log);
  }

  public async getChildren(node?: TreeNode): Promise<TreeNode[]> {
    return this.tree.children(node);
  }

  public getTreeItem(node: TreeNode): vscode.TreeItem {
    const row = this.tree.rowOf(node);

    return toTreeItem(row, this.tree.iconsMode());
  }

  public refreshFor(change: RootChange): void {
    this.tree.refreshFor(change);
  }

  public setMode(mode: TreeMode): void {
    this.tree.setMode(mode);
  }

  public setIcons(icons: IconsMode): void {
    this.tree.setIcons(icons);
  }

  public runChanged(entry: RunEntry): void {
    this.tree.runChanged(entry);
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
    this.hasScripts.refresh();
    this.singlePackage.refresh();
    this.tree.rootsChanged();
  }

  public refreshAtoms(): void {
    this.tree.refreshAtoms();
  }

  public dispose(): void {
    this.tree.dispose();
    this.unsubscribe();
    this.hasScripts.dispose();
    this.singlePackage.dispose();
    this.emitter.dispose();
  }
}
