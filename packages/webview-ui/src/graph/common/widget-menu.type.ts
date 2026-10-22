/** A menu entry: focusable, activated by click, Enter or Space; `checked` is a `menuitemcheckbox`'s `aria-checked`, else `null`. */
export type MenuItem = {
  readonly kind: 'item';
  readonly label: string;
  readonly role: 'menuitem' | 'menuitemcheckbox';
  readonly checked: 'true' | 'false' | 'mixed' | null;
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

/** The folder focus breadcrumb: the way back, the focused folder's title and the list its info lines fill. */
export type BreadcrumbElements = {
  readonly nav: HTMLElement;
  readonly allFolders: HTMLButtonElement;
  readonly title: HTMLElement;
  readonly lines: HTMLElement;
};
