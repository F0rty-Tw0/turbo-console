import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { toTreeItem } from './tree-item.ts';
import type { IconSpec, IconsState, RowKind, TreeRow } from '../common/tree-row.type.ts';
import { ICONS_STATE_STUB } from '../test/stubs/icons-state.stub.ts';
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
    public static readonly File = new ThemeIcon('file');
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

  type FileUri = { readonly scheme?: string; readonly fsPath: string; readonly path: string };
  const fileUri = (fsPath: string): FileUri => {
    const uri: FileUri = { fsPath, path: fsPath };

    return uri;
  };

  type UriParts = { readonly scheme: string; readonly path: string };
  const fromParts = ({ scheme, path }: UriParts): FileUri => {
    const uri: FileUri = { scheme, fsPath: path, path };

    return uri;
  };
  const uriModule = { file: fileUri, from: fromParts };
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
      const { tooltip } = toTreeItem(rowOf(kind, TOOLTIP_LINES), ICONS_STATE_STUB);

      expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
      expect(tooltip).toHaveProperty('value', TOOLTIP_MARKDOWN);
    });
  });

  describe('GIVEN a row with no tooltip lines', () => {
    it('WHEN built THEN the tooltip stays unset', () => {
      expect(toTreeItem(rowOf('pkg', []), ICONS_STATE_STUB).tooltip).toBeUndefined();
    });
  });
});

const FOLDER = 'packages/libs';

const ROW_KINDS: RowKind[] = ['root', 'dir', 'pkg', 'scripts', 'task', 'msg'];

const folderRowOf = (kind: RowKind, folder = FOLDER): TreeRow => {
  const row: TreeRow = { ...TREE_ROW_STUB, kind, folder };

  return row;
};

const idOf = (iconPath: vscode.TreeItem['iconPath']): string | undefined => {
  if (iconPath instanceof vscode.ThemeIcon) return iconPath.id;

  return undefined;
};

const THEME_ICONS_STATE: IconsState = { ...ICONS_STATE_STUB, mode: 'theme' };

const NAMES = new Set(['vitest.config.js', 'tsconfig.json']);
const THEME_NAMES_STATE: IconsState = { mode: 'theme', fileNames: NAMES };
const BUILTIN_NAMES_STATE: IconsState = { mode: 'builtin', fileNames: NAMES };

const VITEST_ICON: IconSpec = { id: 'turbo-console-vitest', color: null };

const BARE_TOOL_ROW: TreeRow = { ...TREE_ROW_STUB, kind: 'task', icon: VITEST_ICON };

const toolRowOf = (themeFiles: string[]): TreeRow => {
  const row: TreeRow = { ...BARE_TOOL_ROW, themeFiles };

  return row;
};

describe('FEATURE: tree item theme file icons', () => {
  describe('GIVEN an idle tool row naming two config files', () => {
    const row = toolRowOf(['vitest.config.ts', 'vitest.config.js']);

    it('WHEN the theme names only the second THEN the icon is the theme file icon over that name', () => {
      const item = toTreeItem(row, THEME_NAMES_STATE);

      expect(item.iconPath).toBe(vscode.ThemeIcon.File);
      expect(item.resourceUri?.path).toBe('/vitest.config.js');
      expect(item.resourceUri?.scheme).toBe('turbo-console-icon');
    });

    it('WHEN the theme names the first too THEN the first wins', () => {
      const names = new Set(['vitest.config.js', 'vitest.config.ts']);

      const item = toTreeItem(row, { mode: 'theme', fileNames: names });

      expect(item.resourceUri?.path).toBe('/vitest.config.ts');
    });

    it('WHEN the theme names neither THEN the glyph stays and there is no resource uri', () => {
      const item = toTreeItem(row, { mode: 'theme', fileNames: new Set(['angular.json']) });

      expect(idOf(item.iconPath)).toBe('turbo-console-vitest');
      expect(item.resourceUri).toBeUndefined();
    });

    it('WHEN the mode is builtin THEN the glyph stays whatever the names are', () => {
      const item = toTreeItem(row, BUILTIN_NAMES_STATE);

      expect(idOf(item.iconPath)).toBe('turbo-console-vitest');
      expect(item.resourceUri).toBeUndefined();
    });

    it('WHEN the theme icon is drawn THEN the tooltip is still the row markdown', () => {
      const tooltipRow: TreeRow = { ...row, tooltip: TOOLTIP_LINES };

      const { tooltip } = toTreeItem(tooltipRow, THEME_NAMES_STATE);

      expect(tooltip).toMatchObject({ value: TOOLTIP_MARKDOWN });
    });
  });

  describe('GIVEN a task row without themeFiles', () => {
    it('WHEN built in theme mode THEN the glyph stays', () => {
      const item = toTreeItem(BARE_TOOL_ROW, THEME_NAMES_STATE);

      expect(idOf(item.iconPath)).toBe('turbo-console-vitest');
      expect(item.resourceUri).toBeUndefined();
    });
  });

  describe('GIVEN a folder row that also carries themeFiles', () => {
    it('WHEN built in theme mode THEN the folder icon wins', () => {
      const folderRow = folderRowOf('pkg');
      const row: TreeRow = { ...folderRow, themeFiles: ['tsconfig.json'] };

      const item = toTreeItem(row, THEME_NAMES_STATE);

      expect(item.iconPath).toBe(vscode.ThemeIcon.Folder);
    });
  });
});

describe('FEATURE: tree item icons', () => {
  describe.each<RowKind>(['dir', 'pkg'])('GIVEN a %s row with a folder', (kind) => {
    it('WHEN built in theme mode THEN the icon is the theme folder over that directory', () => {
      const item = toTreeItem(folderRowOf(kind), THEME_ICONS_STATE);

      expect(item.iconPath).toBe(vscode.ThemeIcon.Folder);
      expect(item.resourceUri?.fsPath).toBe(join('/ws', FOLDER));
    });
  });

  describe('GIVEN the root package // whose folder is the root itself', () => {
    it('WHEN built in theme mode THEN the resource uri is the root, with no trailing separator', () => {
      const item = toTreeItem(folderRowOf('pkg', ''), THEME_ICONS_STATE);

      expect(item.resourceUri?.fsPath).toBe(join('/ws', ''));
    });
  });

  describe.each(ROW_KINDS)('GIVEN a %s row', (kind) => {
    it('WHEN built in builtin mode THEN a folder changes nothing', () => {
      const plain: TreeRow = { ...TREE_ROW_STUB, kind };

      expect(toTreeItem(folderRowOf(kind), ICONS_STATE_STUB)).toStrictEqual(toTreeItem(plain, ICONS_STATE_STUB));
    });
  });

  describe('GIVEN a pkg row with a folder', () => {
    it('WHEN built in builtin mode THEN the icon is the codicon and there is no resource uri', () => {
      const item = toTreeItem(folderRowOf('pkg'), ICONS_STATE_STUB);

      expect(idOf(item.iconPath)).toBe('package');
      expect(item.resourceUri).toBeUndefined();
    });
  });

  describe.each<RowKind>(['root', 'task'])('GIVEN a %s row with no folder', (kind) => {
    it('WHEN built in theme mode THEN the item matches the builtin one', () => {
      const row: TreeRow = { ...TREE_ROW_STUB, kind };
      const themed = toTreeItem(row, THEME_ICONS_STATE);
      const builtin = toTreeItem(row, ICONS_STATE_STUB);

      expect(idOf(themed.iconPath)).toBe(idOf(builtin.iconPath));
      expect(themed.resourceUri).toBeUndefined();
    });
  });
});
