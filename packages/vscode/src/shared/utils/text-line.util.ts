/** The editor counts CR LF, a lone CR and a lone LF as one line break each. */
const LINE_BREAK = /\r\n|[\r\n]/g;

export const lineAt = (text: string, offset: number): number => {
  const breaks = text.slice(0, offset).match(LINE_BREAK);

  return breaks?.length ?? 0;
};

/** The lines of `text` without their breaks: element `i` is editor line `i`; a text ending in a break ends in an empty line. */
export const linesOf = (text: string): string[] => text.split(LINE_BREAK);
