import type { GraphIconId } from './graph-icon.type.ts';

/** A menu entry: focusable, activated by click, Enter or Space; `icon` is its leading Codicon, `null` for none. */
export type MenuItem = {
  readonly kind: 'item';
  readonly label: string;
  /** The hover text when it says more than the label; the label otherwise. */
  readonly title?: string;
  readonly icon: GraphIconId | null;
  /** Still focusable (`aria-disabled`); the menu never runs it. */
  readonly isDisabled: boolean;
  readonly run: () => void;
};

type MenuSeparator = {
  readonly kind: 'separator';
};

export type MenuItemModel = MenuItem | MenuSeparator;

/** A built menu: its root and one element per item of the model, in order, separators left out. */
export type MenuElements = {
  readonly menu: HTMLElement;
  readonly items: HTMLElement[];
};
