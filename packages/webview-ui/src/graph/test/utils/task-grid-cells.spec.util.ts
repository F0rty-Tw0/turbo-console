import { childAt } from './html-child.spec.util.ts';

/** The check of the Projects grid row at `index`: the first cell's first child. */
export const checkAt = (list: HTMLElement, index: number): HTMLElement => childAt(childAt(childAt(list, index), 0), 0);

/** The name button of the Projects grid row at `index`: the second cell's first child. */
export const nameAt = (list: HTMLElement, index: number): HTMLElement => childAt(childAt(childAt(list, index), 1), 0);

const isInput = (box: HTMLElement): box is HTMLInputElement => box.tagName === 'INPUT';

/** What the user does to a checkbox: sets it, then the input event follows; throws when `box` is not an input. */
export const tick = (box: HTMLElement, isChecked: boolean): void => {
  if (!isInput(box)) throw new Error('not an input');

  box.checked = isChecked;
  box.dispatchEvent(new Event('input'));
};
