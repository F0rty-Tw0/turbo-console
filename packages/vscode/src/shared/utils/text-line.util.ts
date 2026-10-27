import type { TextPosition } from '../common/text-position.type.ts';

/** The editor counts CR LF, a lone CR and a lone LF as one line break each. */
const LINE_BREAK = /\r\n|[\r\n]/g;

export const lineAt = (text: string, offset: number): number => {
  const breaks = text.slice(0, offset).match(LINE_BREAK);

  return breaks?.length ?? 0;
};

/** The lines of `text` without their breaks: element `i` is editor line `i`; a text ending in a break ends in an empty line. */
export const linesOf = (text: string): string[] => text.split(LINE_BREAK);

/** The editor line and character of `offset`: the line counts like `lineAt`, the character counts from the last break before it. */
export const positionAt = (text: string, offset: number): TextPosition => {
  const before = text.slice(0, offset);
  let lineStart = 0;
  let line = 0;

  for (const lineBreak of before.matchAll(LINE_BREAK)) {
    lineStart = lineBreak.index + lineBreak[0].length;
    line += 1;
  }

  const position: TextPosition = { line, character: before.length - lineStart };

  return position;
};
