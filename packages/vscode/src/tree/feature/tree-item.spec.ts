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
  const module = { TreeItem, ThemeIcon, ThemeColor, MarkdownString, TreeItemCollapsibleState: collapsibleStates };

  return module;
});

const TOOLTIP_LINES = ['Path: packages/libs', 'Packages: 2'];
const TOOLTIP_MARKDOWN = 'Path\\: packages\\/libs\\\nPackages\\: 2';
const MARKDOWN_KINDS: RowKind[] = ['root', 'dir', 'pkg'];

const rowOf = (kind: RowKind, tooltip: string[]): TreeRow => {
  const row: TreeRow = { ...TREE_ROW_STUB, kind, tooltip };

  return row;
};

describe('FEATURE: tree item tooltip', () => {
  describe.each(MARKDOWN_KINDS)('GIVEN a %s row with tooltip lines', (kind) => {
    it('WHEN built THEN the tooltip is markdown reading the lines, so VS Code keeps label and description as its aria label', () => {
      const { tooltip } = toTreeItem(rowOf(kind, TOOLTIP_LINES));

      expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
      expect(tooltip).toHaveProperty('value', TOOLTIP_MARKDOWN);
    });
  });

  describe('GIVEN a task row with tooltip lines', () => {
    it('WHEN built THEN the tooltip stays a plain string', () => {
      const { tooltip } = toTreeItem(rowOf('task', TOOLTIP_LINES));

      expect(tooltip).toBe('Path: packages/libs\nPackages: 2');
    });
  });

  describe('GIVEN a row with no tooltip lines', () => {
    it('WHEN built THEN the tooltip stays unset', () => {
      expect(toTreeItem(rowOf('pkg', [])).tooltip).toBeUndefined();
    });
  });
});
