import { jsonPropertyAt } from '../../shared/utils/json-property.util.ts';
import { positionAt } from '../../shared/utils/text-line.util.ts';
import type { TextSelection } from '../common/package-action.type.ts';

/** The `"name": value` property of script `name` in a `package.json` text, from its key's opening quote to the end of its value; `null` for no such script. */
export const scriptSelectionOf = (text: string, name: string): TextSelection | null => {
  const property = jsonPropertyAt(text, ['scripts', name]);

  if (property === null) return null;

  const start = positionAt(text, property.offset);
  const end = positionAt(text, property.offset + property.length);
  const selection: TextSelection = { start, end };

  return selection;
};
