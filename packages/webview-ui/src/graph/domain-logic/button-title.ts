import { CLEAR_FOCUS_LABEL } from '../common/details.const.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';
import { focusFaceOf } from '../utils/details-text.util.ts';

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
  const face = focusFaceOf(isFocused);

  setIconTextButton(button, face.icon, face.text);
};

/** A Focus toggle shows its state by `aria-pressed` under a constant name; its hover title says what a press does. */
export const setFocusToggle = (button: HTMLButtonElement, isFocus: boolean, focusTitle: string): void => {
  const title = isFocus ? CLEAR_FOCUS_LABEL : focusTitle;
  const pressed = String(isFocus);

  if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);

  if (button.title !== title) button.title = title;
};
