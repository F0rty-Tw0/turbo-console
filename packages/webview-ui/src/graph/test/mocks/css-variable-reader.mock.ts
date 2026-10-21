import type { CssVariableReader } from '../../common/theme-colors.type.ts';

/** Reads from `values` (`''` when absent) and appends every name read to `read`. */
export const cssVariableReaderMock = (values: Record<string, string>, read: string[] = []): CssVariableReader => {
  const reader = (name: string): string => {
    read.push(name);

    return values[name] ?? '';
  };

  return reader;
};
