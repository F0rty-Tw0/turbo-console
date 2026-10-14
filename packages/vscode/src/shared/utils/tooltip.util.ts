import { cleanText } from './clean-text.util.ts';
import { TOOLTIP_LINE_MAX } from '../common/text.const.ts';

/**
 * A plain-string tooltip of `lines`, each cleaned and cut to `TOOLTIP_LINE_MAX`, one per line. A plain string renders
 * as text: repo text cannot form a link, an entity or any other markdown.
 */
export const tooltipOf = (lines: string[]): string => {
  const cleaned = lines.map((line) => cleanText(line, TOOLTIP_LINE_MAX));

  return cleaned.join('\n');
};
