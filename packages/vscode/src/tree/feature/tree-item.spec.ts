import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { toTreeItem } from './tree-item.ts';
import type { RowKind, TreeRow } from '../common/tree-row.type.ts';
import { TREE_ROW_STUB } from '../test/stubs/tree-row.stub.ts';

/** `vscode` exists only inside the editor, so the module is replaced here by the classes `tree-item.ts` builds. */
vi.mock('vscode', () => {
  class TreeItem {
    public readonly label: string;

    public constructor(label: string) {
      this.label = label;
    }
  }

  class ThemeIcon {
    public static readonly Folder = new ThemeIcon('folder');
    public readonly id: string;

    public constructor(id: string) {
      this.id = id;
    }
  }

  class ThemeColor {
    public readonly id: string;

    public constructor(id: string) {
      this.id = id;
    }
  }

  class MarkdownString {
    public readonly value: string;

    public constructor(value: string) {
      this.value = value;
    }
  }
  const collapsibleStates = { None: 0, Collapsed: 1, Expanded: 2 };

  type FileUri = { readonly fsPath: string };
  const fileUri = (fsPath: string): FileUri => {
    const uri: FileUri = { fsPath };

    return uri;
  };
  const uriModule = { file: fileUri };
  const module = { TreeItem, ThemeIcon, ThemeColor, MarkdownString, Uri: uriModule, TreeItemCollapsibleState: collapsibleStates };

  return module;
});

const TOOLTIP_LINES = ['Path: packages/libs', 'Packages: 2'];
const TOOLTIP_MARKDOWN = 'Path\\: packages\\/libs\\\nPackages\\: 2';
const MARKDOWN_KINDS: RowKind[] = ['root', 'dir', 'pkg', 'task'];

const rowOf = (kind: RowKind, tooltip: string[]): TreeRow => {
  const row: TreeRow = { ...TREE_ROW_STUB, kind, tooltip };

  return row;
};

describe('FEATURE: tree item tooltip', () => {
  describe.each(MARKDOWN_KINDS)('GIVEN a %s row with tooltip lines', (kind) => {
    it('WHEN built THEN the tooltip is markdown reading the lines, so VS Code keeps label and description as its aria label', () => {
      const { tooltip } = toTreeItem(rowOf(kind, TOOLTIP_LINES), 'builtin');

      expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
      expect(tooltip).toHaveProperty('value', TOOLTIP_MARKDOWN);
    });
  });

  describe('GIVEN a row with no tooltip lines', () => {
    it('WHEN built THEN the tooltip stays unset', () => {
      expect(toTreeItem(rowOf('pkg', []), 'builtin').tooltip).toBeUndefined();
    });
  });
});

const FOLDER_PATH = '/ws/packages/libs';

const folderRowOf = (kind: RowKind): TreeRow => {
  const row: TreeRow = { ...TREE_ROW_STUB, kind, folder: FOLDER_PATH };

  return row;
};

const idOf = (iconPath: vscode.TreeItem['iconPath']): string | undefined => {
  if (iconPath instanceof vscode.ThemeIcon) return iconPath.id;

  return undefined;
};

describe('FEATURE: tree item icons', () => {
  describe.each<RowKind>(['dir', 'pkg'])('GIVEN a %s row with a folder', (kind) => {
    it('WHEN built in theme mode THEN the icon is the theme folder over that directory', () => {
      const item = toTreeItem(folderRowOf(kind), 'theme');

      expect(item.iconPath).toBe(vscode.ThemeIcon.Folder);
      expect(item.resourceUri?.fsPath).toBe(FOLDER_PATH);
    });
  });

  describe('GIVEN a pkg row with a folder', () => {
    it('WHEN built in builtin mode THEN the icon is the codicon and there is no resource uri', () => {
      const item = toTreeItem(folderRowOf('pkg'), 'builtin');

      expect(idOf(item.iconPath)).toBe('package');
      expect(item.resourceUri).toBeUndefined();
    });
  });

  describe.each<RowKind>(['root', 'task'])('GIVEN a %s row with no folder', (kind) => {
    it('WHEN built in theme mode THEN the item matches the builtin one', () => {
      const row: TreeRow = { ...TREE_ROW_STUB, kind };
      const themed = toTreeItem(row, 'theme');
      const builtin = toTreeItem(row, 'builtin');

      expect(idOf(themed.iconPath)).toBe(idOf(builtin.iconPath));
      expect(themed.resourceUri).toBeUndefined();
    });
  });
});
