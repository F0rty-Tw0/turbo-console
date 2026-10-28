import type { ControlsElements, ControlsGroup, ControlsRow } from '../../common/controls-elements.type.ts';

/** The panel's group of `folder`; throws when it has none. */
export const groupOf = (elements: ControlsElements, folder: string): ControlsGroup => {
  const found = elements.groups.find((group) => group.folder === folder);

  if (found === undefined) throw new Error(`no group ${folder}`);

  return found;
};

/** The panel's row of `name`, in any group; throws when it has none. */
export const rowOf = (elements: ControlsElements, name: string): ControlsRow => {
  const rows = elements.groups.flatMap((group) => group.rows);
  const found = rows.find((row) => row.name === name);

  if (found === undefined) throw new Error(`no row ${name}`);

  return found;
};

/** The class of the button's first child, the Codicon it draws. */
export const iconClassOf = (button: HTMLButtonElement): string | undefined => button.children[0]?.className;
