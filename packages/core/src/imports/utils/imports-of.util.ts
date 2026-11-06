import { dynamicImportAt, requireAt, requireSpecifierAt } from './import-calls.util.ts';
import { importClauseOf } from './import-clause.util.ts';
import { lineIndexOf, lineStartsOf, lineTextOf } from './source-lines.util.ts';
import { isAnyWord, isPunct, isWord, startOf } from './source-token-match.util.ts';
import { sourceTokensOf } from './source-tokens.util.ts';
import type { ImportClause } from '../common/import-clause.type.ts';
import type { ImportForm, SourceImport } from '../common/import-scan.type.ts';
import type { SourceToken } from '../common/source-token.type.ts';

type ClauseKind = Extract<ImportForm['kind'], 'static' | 'reexport'>;

type FormHead = {
  readonly kind: ClauseKind;
  readonly isModifier: boolean;
  readonly start: number;
};

const isTypeModifierAt = (tokens: SourceToken[], index: number): boolean => {
  const follower = tokens[index + 1];
  const isTypeWord = isWord(tokens[index], 'type');
  const isBrace = isPunct(follower, '{');
  const isStar = isPunct(follower, '*');
  const isWordFollower = isAnyWord(follower);
  const isFromOrAs = follower?.value === 'from' || follower?.value === 'as';
  const isBindingWord = isWordFollower && !isFromOrAs;
  const isModifierFollower = isBrace || isStar || isBindingWord;

  return isTypeWord && isModifierFollower;
};

const isAllTypeItems = (clause: ImportClause): boolean => {
  const hasItems = clause.items > 0;
  const isAllType = clause.typeItems === clause.items;

  return !clause.hasBinding && hasItems && isAllType;
};

const equalsRequireAt = (tokens: SourceToken[], clause: ImportClause, head: FormHead): ImportForm | null => {
  const specifier = requireSpecifierAt(tokens, clause.next + 1);
  const isEquals = isPunct(tokens[clause.next], '=');

  if (!isEquals || !specifier) return null;

  const { isModifier, start } = head;
  const form: ImportForm = { specifier: specifier.value, kind: 'require', isType: isModifier, start, next: clause.next + 5 };

  return form;
};

const fromFormAt = (tokens: SourceToken[], clause: ImportClause, head: FormHead): ImportForm | null => {
  const specifier = tokens[clause.next + 1];
  const isFrom = isWord(tokens[clause.next], 'from');

  if (!isFrom || specifier?.kind !== 'string') return null;

  const { kind, isModifier, start } = head;
  const isType = isModifier || isAllTypeItems(clause);
  const form: ImportForm = { specifier: specifier.value, kind, isType, start, next: clause.next + 2 };

  return form;
};

const clauseFormAt = (tokens: SourceToken[], index: number, kind: ClauseKind): ImportForm | null => {
  const isModifier = isTypeModifierAt(tokens, index + 1);
  const clauseOffset = isModifier ? 2 : 1;
  const clauseFrom = index + clauseOffset;
  const clause = importClauseOf(tokens, clauseFrom);
  const head: FormHead = { kind, isModifier, start: startOf(tokens, index) };

  if (!clause) return null;

  const fromForm = fromFormAt(tokens, clause, head);

  if (fromForm || kind === 'reexport') return fromForm;

  return equalsRequireAt(tokens, clause, head);
};

const importAt = (tokens: SourceToken[], index: number): ImportForm | null => {
  const follower = tokens[index + 1];
  const isMeta = isPunct(follower, '.');
  const isCall = isPunct(follower, '(');

  if (isMeta) return null;

  if (isCall) return dynamicImportAt(tokens, index);

  if (follower?.kind !== 'string') return clauseFormAt(tokens, index, 'static');

  const start = startOf(tokens, index);
  const form: ImportForm = { specifier: follower.value, kind: 'static', isType: false, start, next: index + 2 };

  return form;
};

const exportAt = (tokens: SourceToken[], index: number): ImportForm | null => {
  const isExportImport = isWord(tokens[index + 1], 'import');

  if (!isExportImport) return clauseFormAt(tokens, index, 'reexport');

  const inner = clauseFormAt(tokens, index + 1, 'static');

  if (inner?.kind !== 'require') return null;

  const form: ImportForm = { ...inner, isType: false, start: startOf(tokens, index) };

  return form;
};

const formAt = (tokens: SourceToken[], index: number): ImportForm | null => {
  const token = tokens[index];
  const isProperty = isPunct(tokens[index - 1], '.');
  const isImport = isWord(token, 'import');
  const isExport = isWord(token, 'export');
  const isRequire = isWord(token, 'require');

  if (isProperty) return null;

  if (isImport) return importAt(tokens, index);

  if (isExport) return exportAt(tokens, index);

  if (isRequire) return requireAt(tokens, index);

  return null;
};

export const importsOf = (text: string): SourceImport[] => {
  const tokens = sourceTokensOf(text);
  const lineStarts = lineStartsOf(text);
  const sites: SourceImport[] = [];
  let index = 0;

  while (index < tokens.length) {
    const form = formAt(tokens, index);

    if (!form) {
      index += 1;
      continue;
    }

    const line = lineIndexOf(lineStarts, form.start);
    const lineText = lineTextOf(text, lineStarts, line);
    const { specifier, kind, isType } = form;
    const site: SourceImport = { specifier, kind, isType, line, text: lineText };

    sites.push(site);
    index = form.next;
  }

  return sites;
};
