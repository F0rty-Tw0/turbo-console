import { CLEAR_FOCUS_LABEL, FOCUS_LABEL } from '../common/details.const.ts';
import { ACTION_ICONS } from '../common/graph-icon.const.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';

/** Sets a button's text and its hover title together, so the title never keeps an old label. */
export const setButtonText = (button: HTMLButtonElement, text: string): void => {
  button.textContent = text;
  button.title = text;
};

/** Sets a button's accessible name and its hover title together. */
export const setButtonLabel = (button: HTMLButtonElement, label: string): void => {
  button.setAttribute('aria-label', label);
  button.title = label;
};

/** Swaps the Codicon drawn by a button's first child; a button without children is left alone. */
export const setButtonIcon = (button: HTMLButtonElement, id: GraphIconId): void => {
  const icon = button.children[0];

  if (icon !== undefined) icon.className = `codicon codicon-${id}`;
};

/** Sets an icon and label button's icon, label text and hover title together, keeping both children. */
export const setIconTextButton = (button: HTMLButtonElement, id: GraphIconId, text: string): void => {
  const label = button.children[1];

  setButtonIcon(button, id);
  button.title = text;

  if (label !== undefined) label.textContent = text;
};

/** Draws a package's Focus button as Clear focus while it is the focus, else as Focus. */
export const setFocusButton = (button: HTMLButtonElement, isFocused: boolean): void => {
  if (isFocused) setIconTextButton(button, ACTION_ICONS.clearFocus, CLEAR_FOCUS_LABEL);
  else setIconTextButton(button, ACTION_ICONS.focus, FOCUS_LABEL);
};
