import type { TextSelection } from './package-action.type.ts';
import type { TextPosition } from '../../shared/common/text-position.type.ts';

const FIRST_CHARACTER: TextPosition = { line: 0, character: 0 };

/** The empty selection at the first character: opening a file with it reveals the top and clears a selection the editor still holds. */
export const TOP_SELECTION: TextSelection = { start: FIRST_CHARACTER, end: FIRST_CHARACTER };
