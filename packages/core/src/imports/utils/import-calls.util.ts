import { isPunct, isWord, startOf } from './source-token-match.util.ts';
import type { ImportForm } from '../common/import-scan.type.ts';
import type { SourceToken } from '../common/source-token.type.ts';

export const requireSpecifierAt = (tokens: SourceToken[], index: number): SourceToken | null => {
  const specifier = tokens[index + 2];
  const isRequire = isWord(tokens[index], 'require');
  const isOpen = isPunct(tokens[index + 1], '(');
  const isClose = isPunct(tokens[index + 3], ')');
  const isCall = isRequire && isOpen && isClose;

  if (!isCall || specifier?.kind !== 'string') return null;

  return specifier;
};

export const requireAt = (tokens: SourceToken[], index: number): ImportForm | null => {
  const specifier = requireSpecifierAt(tokens, index);
  const start = startOf(tokens, index);

  if (!specifier) return null;

  const form: ImportForm = { specifier: specifier.value, kind: 'require', isType: false, start, next: index + 4 };

  return form;
};

export const dynamicImportAt = (tokens: SourceToken[], index: number): ImportForm | null => {
  const specifier = tokens[index + 2];
  const isOpen = isPunct(tokens[index + 1], '(');
  const isClose = isPunct(tokens[index + 3], ')');
  const isComma = isPunct(tokens[index + 3], ',');
  const isEnd = isClose || isComma;
  const isQuoted = specifier?.kind === 'string' || specifier?.kind === 'template';

  if (!isOpen || !isEnd || !isQuoted) return null;

  const isType = isWord(tokens[index - 1], 'typeof');
  const start = startOf(tokens, index);
  const form: ImportForm = { specifier: specifier.value, kind: 'dynamic', isType, start, next: index + 3 };

  return form;
};
