import { cleanText } from './clean-text.util.ts';
import { TOOLTIP_LINE_MAX } from '../common/text.const.ts';

/**
 * Every ASCII punctuation character. Markdown reads each one behind a backslash as itself, so escaping them all leaves
 * no emphasis, link, autolink, entity, html or theme icon; `MarkdownString.appendText` leaves `<`, `&`, `:` and `@` open.
 */
const MARKDOWN_PUNCTUATION = /[!-/:-@[-`{-~]/g;

/** A backslash before a line break: markdown's hard line break, so the next line renders on its own line. */
const MARKDOWN_LINE_BREAK = '\\\n';

const cleanLineOf = (line: string): string => cleanText(line, TOOLTIP_LINE_MAX);

const escapedOf = (line: string): string => line.replace(MARKDOWN_PUNCTUATION, '\\$&');

const hasText = (line: string): boolean => line.trim() !== '';

/**
 * A plain-string tooltip of `lines`, each cleaned and cut to `TOOLTIP_LINE_MAX`, one per line. A plain string renders
 * as text: repo text cannot form a link, an entity or any other markdown.
 */
export const tooltipOf = (lines: string[]): string => {
  const cleaned = lines.map(cleanLineOf);

  return cleaned.join('\n');
};

/**
 * The markdown source of `tooltipOf(lines)`: the same cleaned lines, every one escaped, so it renders as that text. A
 * line blank once cleaned is dropped: markdown has no empty line inside a paragraph, and a hard break with nothing after
 * it renders as a stray backslash.
 */
export const tooltipMarkdownOf = (lines: string[]): string => {
  const cleaned = lines.map(cleanLineOf);
  const shown = cleaned.filter(hasText);
  const escaped = shown.map(escapedOf);

  return escaped.join(MARKDOWN_LINE_BREAK);
};
