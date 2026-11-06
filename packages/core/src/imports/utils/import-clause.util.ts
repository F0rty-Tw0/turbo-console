import { isAnyWord, isPunct, isWord } from './source-token-match.util.ts';
import type { ImportClause } from '../common/import-clause.type.ts';
import type { SourceToken } from '../common/source-token.type.ts';

type NamedItems = {
  readonly next: number;
  readonly itemStarts: number[];
};

/** The longest named item is `type a as b`. */
const NAMED_ITEM_TOKENS_MAX = 4;

const isOutsideNamedItems = (token: SourceToken | undefined): boolean => {
  const isBrace = isPunct(token, '{');
  const isParen = isPunct(token, '(');
  const isSemicolon = isPunct(token, ';');

  return isBrace || isParen || isSemicolon;
};

/** A `type` modifier is followed by the item's name: a word, or a string (`type "a-b" as x`). */
const isTypeItem = (tokens: SourceToken[], start: number): boolean => {
  const follower = tokens[start + 1];
  const isTypeWord = isWord(tokens[start], 'type');
  const isWordFollower = isAnyWord(follower);
  const isStringFollower = follower?.kind === 'string';
  const isNameFollower = isWordFollower || isStringFollower;
  const isAs = isWord(follower, 'as');

  return isTypeWord && isNameFollower && !isAs;
};

const itemStartAfter = (index: number, itemStart: number, endsItem: boolean): number => {
  const hasItem = itemStart >= 0;

  if (endsItem) return -1;

  if (hasItem) return itemStart;

  return index;
};

/** Named items never nest: the walk stops at a token no item holds instead of scanning on to a far `}`. */
const namedItemsOf = (tokens: SourceToken[], open: number): NamedItems | null => {
  const itemStarts: number[] = [];
  let itemStart = -1;

  for (let index = open + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const isClose = isPunct(token, '}');
    const isComma = isPunct(token, ',');
    const endsItem = isClose || isComma;
    const hasItem = itemStart >= 0;
    const isItemTooLong = hasItem && index - itemStart > NAMED_ITEM_TOKENS_MAX;
    const isOutside = isOutsideNamedItems(token);

    if (isOutside || isItemTooLong) return null;

    if (endsItem && hasItem) itemStarts.push(itemStart);

    itemStart = itemStartAfter(index, itemStart, endsItem);

    if (isClose) {
      const named: NamedItems = { next: index + 1, itemStarts };

      return named;
    }
  }

  return null;
};

const namedClauseAt = (tokens: SourceToken[], open: number, hasBinding: boolean): ImportClause | null => {
  const named = namedItemsOf(tokens, open);

  if (!named) return null;

  const typeStarts = named.itemStarts.filter((start) => isTypeItem(tokens, start));
  const clause: ImportClause = { next: named.next, hasBinding, typeItems: typeStarts.length, items: named.itemStarts.length };

  return clause;
};

const starClauseAt = (tokens: SourceToken[], star: number, hasBinding: boolean): ImportClause => {
  const name = tokens[star + 2];
  const hasAs = isWord(tokens[star + 1], 'as');
  const isNameWord = isAnyWord(name);
  const isNameString = name?.kind === 'string';
  const isName = isNameWord || isNameString;
  const isNamespace = hasAs && isName;
  let next = star + 1;

  if (isNamespace) next = star + 3;

  const clause: ImportClause = { next, hasBinding: hasBinding || isNamespace, typeItems: 0, items: 0 };

  return clause;
};

const clauseAt = (tokens: SourceToken[], clauseIndex: number, hasBinding: boolean): ImportClause | null => {
  const token = tokens[clauseIndex];
  const isBrace = isPunct(token, '{');
  const isStar = isPunct(token, '*');

  if (isBrace) return namedClauseAt(tokens, clauseIndex, hasBinding);

  if (isStar) return starClauseAt(tokens, clauseIndex, hasBinding);

  if (!hasBinding) return null;

  const clause: ImportClause = { next: clauseIndex, hasBinding, typeItems: 0, items: 0 };

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
export const importClauseOf = (tokens: SourceToken[], clauseIndex: number): ImportClause | null => {
  const hasDefault = isAnyWord(tokens[clauseIndex]);
  let clauseStart = clauseIndex;

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
