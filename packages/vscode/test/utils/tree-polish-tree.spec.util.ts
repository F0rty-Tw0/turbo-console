import type * as vscode from 'vscode';

import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode, TreeRefresh } from '../../src/tree/common/tree-node.type.ts';
import type { PackageRowFacts, Redraws } from '../common/tree-polish.type.ts';

/** Markdown reads a backslash before ASCII punctuation as that character; a backslash before a line break is a hard break. */
const ESCAPED_PUNCTUATION = /\\([!-/:-@[-`{-~])/gu;

const HARD_BREAK = '\\\n';

const isContainer = (node: TreeNode): boolean => node.kind === 'root' || node.kind === 'dir';

const isPackage = (node: TreeNode): boolean => node.kind === 'pkg';

const unescaped = (line: string): string => line.replace(ESCAPED_PUNCTUATION, '$1');

const byName = (left: PackageRowFacts, right: PackageRowFacts): number =>
  Number(left.name > right.name) - Number(left.name < right.name);

/** Every package node of the tree in its current mode, reached through root and dir nodes only. */
export const packageNodes = async (api: TurboConsoleApi): Promise<TreeNode[]> => {
  const packages: TreeNode[] = [];
  const parents: (TreeNode | undefined)[] = [undefined];

  for (const parent of parents) {
    const children = await api.tree.getChildren(parent);

    const found = children.filter(isPackage);
    const containers = children.filter(isContainer);

    packages.push(...found);
    parents.push(...containers);
  }

  return packages;
};

export const labelOf = (item: vscode.TreeItem): string => {
  const { label } = item;

  if (typeof label === 'string') return label;

  return label?.label ?? '';
};

/** The tooltip's lines as the row text read them: each markdown line unescaped. */
export const tooltipLinesOf = (item: vscode.TreeItem): string[] => {
  const { tooltip } = item;

  if (tooltip === undefined) return [];

  const text = typeof tooltip === 'string' ? tooltip : tooltip.value;
  const lines = text.split(HARD_BREAK);

  return lines.map(unescaped);
};

export const descriptionOf = (api: TurboConsoleApi, node: TreeNode): string => {
  const { description } = api.tree.getTreeItem(node);

  if (typeof description !== 'string') throw new Error(`${node.key} has no description`);

  return description;
};

/** Every package row's facts, sorted by package name. */
export const packageRows = async (api: TurboConsoleApi): Promise<PackageRowFacts[]> => {
  const nodes = await packageNodes(api);
  const factsOf = (node: TreeNode): PackageRowFacts => {
    const item = api.tree.getTreeItem(node);
    const lines = tooltipLinesOf(item);
    const facts: PackageRowFacts = { id: item.id ?? '', name: node.key, label: labelOf(item), tooltipName: lines.at(0) ?? '' };

    return facts;
  };

  return nodes.map(factsOf).sort(byName);
};

const isRedrawOf = (node: TreeNode, refresh: TreeRefresh): boolean => {
  if (Array.isArray(refresh)) return refresh.includes(node);

  return refresh === node;
};

/** Counts the tree events that name `node`, alone or in a list; an event for the whole tree does not count. */
export const countRedraws = (api: TurboConsoleApi, node: TreeNode): Redraws => {
  let count = 0;
  const listening = api.tree.onDidChangeTreeData((refresh) => {
    const isRedraw = isRedrawOf(node, refresh);

    if (isRedraw) count += 1;
  });
  const redraws: Redraws = {
    count: () => count,
    dispose: () => {
      listening.dispose();
    }
  };

  return redraws;
};
