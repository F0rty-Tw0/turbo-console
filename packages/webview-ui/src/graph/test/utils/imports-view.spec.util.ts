import { selfAndBelowOf, textsWith } from './class-elements.spec.util.ts';
import type { ImportsDetails } from '../../common/details-view.type.ts';

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
