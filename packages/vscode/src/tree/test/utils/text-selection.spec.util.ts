import type { TextPosition } from '../../../shared/common/text-position.type.ts';
import type { TextSelection } from '../../common/package-action.type.ts';

/** The selection of characters `from` to `to` on `line`. */
export const selectionOnLine = (line: number, from: number, to: number): TextSelection => {
  const start: TextPosition = { line, character: from };
  const end: TextPosition = { line, character: to };
  const selection: TextSelection = { start, end };

  return selection;
};
