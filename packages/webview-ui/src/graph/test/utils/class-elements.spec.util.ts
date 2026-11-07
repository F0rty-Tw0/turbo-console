import type { ImportsDetails } from '../../common/details-view.type.ts';

/** `element`, then every element under it, depth first. */
export const selfAndBelowOf = (element: Element): Element[] => {
  const children = Array.from(element.children);
  const below = children.flatMap(selfAndBelowOf);

  return [element, ...below];
};

export const textOf = (element: Element): string | null => element.textContent;

/** Every element in `root` or under it that carries `className`, in document order. */
export const withClass = (root: Element, className: string): Element[] => {
  const all = selfAndBelowOf(root);

  return all.filter((element) => element.classList.contains(className));
};

/** Every `inner` element under an `outer` element of `root`, in document order. */
export const withClassIn = (root: Element, outer: string, inner: string): Element[] => {
  const outers = withClass(root, outer);

  return outers.flatMap((element) => withClass(element, inner));
};

/** The direct children of every `className` element of `root`, in document order. */
export const childrenOf = (root: Element, className: string): Element[] => {
  const holders = withClass(root, className);

  return holders.flatMap((holder) => Array.from(holder.children));
};

/** The text of every `className` element of `root`, in document order. */
export const textsWith = (root: Element, className: string): (string | null)[] => withClass(root, className).map(textOf);

/** For each import row of `view`, the text of every `className` element inside its button. */
export const rowTextsWith = (view: ImportsDetails, className: string): (string | null)[][] => {
  return view.rows.map((row) => textsWith(row.button, className));
};

const hasClass = (element: Element, className: string): boolean => element.classList.contains(className);

const firstTextWith = (element: Element, className: string): string => {
  const texts = textsWith(element, className);

  return texts[0] ?? '';
};

/** Names one block element for an order check: a file heading by path, a row by line number, Show more and a note; any other element has no name. */
const blockNameOf = (view: ImportsDetails, element: Element): string | null => {
  const isHeading = hasClass(element, 'details-file');
  const isRow = hasClass(element, 'import-row');
  const isNote = hasClass(element, 'details-muted');

  if (element === view.more) return 'more';

  if (isHeading) return `h4 ${firstTextWith(element, 'details-code')}`;

  if (isRow) return `row ${firstTextWith(element, 'excerpt-number')}`;

  if (isNote) return 'note';

  return null;
};

const isName = (name: string | null): name is string => name !== null;

/** The file headings, rows, Show more and notes under `view.root`, named by `blockNameOf`, in document order. */
export const blockOrderOf = (view: ImportsDetails): string[] => {
  const all = selfAndBelowOf(view.root);
  const names = all.map((element) => blockNameOf(view, element));

  return names.filter(isName);
};

const statusOrLineNameOf = (element: Element): string | null => {
  const isStatus = hasClass(element, 'details-status');
  const isLine = hasClass(element, 'details-line');

  if (isStatus) return 'status';

  if (isLine) return 'line';

  return null;
};

/** The status and every line under `view.root`, named `status` and `line`, in document order. */
export const statusAndLinesOf = (view: ImportsDetails): string[] => {
  const all = selfAndBelowOf(view.root);
  const names = all.map(statusOrLineNameOf);

  return names.filter(isName);
};
