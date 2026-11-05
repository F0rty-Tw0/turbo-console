import { BOM_CODE, CARRIAGE_RETURN_CODE, LINE_FEED_CODE, SOURCE_LINE_MAX } from '../common/source-text.const.ts';

export const bodyStartOf = (text: string): number => {
  const hasBom = text.charCodeAt(0) === BOM_CODE;

  return hasBom ? 1 : 0;
};

export const lineStartsOf = (text: string): number[] => {
  const starts: number[] = [bodyStartOf(text)];

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const nextCode = text.charCodeAt(index + 1);
    const isCrlf = code === CARRIAGE_RETURN_CODE && nextCode === LINE_FEED_CODE;
    const isBreak = code === CARRIAGE_RETURN_CODE || code === LINE_FEED_CODE;

    if (isCrlf) index += 1;

    if (isBreak) starts.push(index + 1);
  }

  return starts;
};

export const lineIndexOf = (lineStarts: number[], offset: number): number => {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const middleStart = lineStarts[middle] ?? 0;

    if (middleStart <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return low;
};

export const lineTextOf = (text: string, lineStarts: number[], line: number): string => {
  const start = lineStarts[line];

  if (start === undefined) return '';

  const next = lineStarts[line + 1] ?? text.length + 1;
  const breakStart = next - 1;
  const beforeCr = next - 2;
  const hasCrBeforeBreak = text.charCodeAt(beforeCr) === CARRIAGE_RETURN_CODE;
  const end = hasCrBeforeBreak ? beforeCr : breakStart;

  return text.slice(start, Math.min(end, start + SOURCE_LINE_MAX));
};
