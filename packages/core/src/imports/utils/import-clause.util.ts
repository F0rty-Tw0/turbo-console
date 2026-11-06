import type { ImportClause, ItemRange, NamedItems } from '../common/import-clause.type.ts';
import type { SourceToken } from '../common/source-token.type.ts';

const isPunct = (token: SourceToken | undefined, value: string): boolean => token?.kind === 'punct' && token.value === value;

const isWord = (token: SourceToken | undefined, value: string): boolean => token?.kind === 'word' && token.value === value;

const isAnyWord = (token: SourceToken | undefined): boolean => token?.kind === 'word';

const depthChangeOf = (token: SourceToken | undefined): number => {
  const isOpen = isPunct(token, '{');
  const isClose = isPunct(token, '}');

  if (isOpen) return 1;

  if (isClose) return -1;

  return 0;
};

const isTypeItem = (tokens: SourceToken[], start: number, end: number): boolean => {
  const follower = tokens[start + 1];
  const isTypeWord = isWord(tokens[start], 'type');
  const isInRange = start + 1 < end;
  const isWordFollower = isAnyWord(follower);
  const isFollowedByWord = isInRange && isWordFollower;
  const isAs = isWord(follower, 'as');

  return isTypeWord && isFollowedByWord && !isAs;
};

const namedItemsOf = (tokens: SourceToken[], open: number): NamedItems | null => {
  const ranges: ItemRange[] = [];
  let depth = 1;
  let itemStart = -1;

  for (let index = open + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const isComma = isPunct(token, ',');

    depth += depthChangeOf(token);

    const isSeparator = isComma && depth === 1;
    const endsItem = isSeparator || depth === 0;
    const hasItem = itemStart >= 0;

    if (endsItem && hasItem) ranges.push({ start: itemStart, end: index });

    if (endsItem) itemStart = -1;

    if (!endsItem && !hasItem) itemStart = index;

    if (depth === 0) {
      const named: NamedItems = { next: index + 1, ranges };

      return named;
    }
  }

  return null;
};

const namedClauseAt = (tokens: SourceToken[], open: number, hasBinding: boolean): ImportClause | null => {
  const named = namedItemsOf(tokens, open);

  if (!named) return null;

  const typeRanges = named.ranges.filter((range) => isTypeItem(tokens, range.start, range.end));
  const clause: ImportClause = { next: named.next, hasBinding, typeItems: typeRanges.length, items: named.ranges.length };

  return clause;
};

const starClauseAt = (tokens: SourceToken[], star: number, hasBinding: boolean): ImportClause => {
  const hasAs = isWord(tokens[star + 1], 'as');
  const isNameWord = isAnyWord(tokens[star + 2]);
  const isNamespace = hasAs && isNameWord;
  let next = star + 1;

  if (isNamespace) next = star + 3;

  const clause: ImportClause = { next, hasBinding: hasBinding || isNamespace, typeItems: 0, items: 0 };

  return clause;
};

const clauseAt = (tokens: SourceToken[], from: number, hasBinding: boolean): ImportClause | null => {
  const token = tokens[from];
  const isBrace = isPunct(token, '{');
  const isStar = isPunct(token, '*');

  if (isBrace) return namedClauseAt(tokens, from, hasBinding);

  if (isStar) return starClauseAt(tokens, from, hasBinding);

  if (!hasBinding) return null;

  const clause: ImportClause = { next: from, hasBinding, typeItems: 0, items: 0 };

  return clause;
};

const isClosedAt = (tokens: SourceToken[], clause: ImportClause, clauseStart: number): boolean => {
  const isFollowedByFrom = isWord(tokens[clause.next], 'from');
  const isBare = clause.next === clauseStart;
  const isEqualsNext = isPunct(tokens[clause.next], '=');
  const isLoneDefaultBeforeEquals = isBare && clause.hasBinding && isEqualsNext;

  return isFollowedByFrom || isLoneDefaultBeforeEquals;
};

/** The clause ends at `from`, or at `=` after a lone default binding (`import x = require('S')`). */
export const importClauseOf = (tokens: SourceToken[], from: number): ImportClause | null => {
  const hasDefault = isAnyWord(tokens[from]);
  let clauseStart = from;

  if (hasDefault) clauseStart += 1;

  const isCommaNext = isPunct(tokens[clauseStart], ',');
  const hasComma = hasDefault && isCommaNext;

  if (hasComma) clauseStart += 1;

  const clause = clauseAt(tokens, clauseStart, hasDefault);

  if (!clause) return null;

  const isCommaDangling = hasComma && clause.next === clauseStart;
  const isClosed = isClosedAt(tokens, clause, clauseStart);

  if (!isClosed || isCommaDangling) return null;

  return clause;
};
