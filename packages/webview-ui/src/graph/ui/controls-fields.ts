import { textElement } from '../../shared/ui/text-element.ts';
import { DEFAULT_DEPTH, GROUP_BY_FOLDER_LABEL, MAX_DEPTH, MIN_DEPTH } from '../common/graph.const.ts';

export const checkbox = (className: string): HTMLInputElement => {
  const check = document.createElement('input');

  check.type = 'checkbox';
  check.className = className;

  return check;
};

/** A caption above its input; the wrapping `<label>` names the input. */
export const field = (text: string, input: HTMLInputElement): HTMLElement => {
  const label = textElement('label', 'controls-field', '');
  const caption = textElement('span', 'controls-caption', text);

  label.append(caption, input);

  return label;
};

export const searchInput = (): HTMLInputElement => {
  const search = document.createElement('input');

  search.type = 'search';
  search.className = 'controls-input';
  search.autocomplete = 'off';
  search.spellcheck = false;

  return search;
};

export const depthInput = (): HTMLInputElement => {
  const depth = document.createElement('input');

  depth.type = 'number';
  depth.className = 'controls-input';
  depth.min = String(MIN_DEPTH);
  depth.max = String(MAX_DEPTH);
  depth.step = '1';
  depth.defaultValue = String(DEFAULT_DEPTH);

  return depth;
};

/** The Group by folder checkbox before its text; the wrapping `<label>` names the input. */
export const groupingField = (input: HTMLInputElement): HTMLElement => {
  const label = textElement('label', 'controls-grouping', GROUP_BY_FOLDER_LABEL);

  label.prepend(input);

  return label;
};
