import type { SourceToken } from '../../common/source-token.type.ts';
import { sourceTokensOf } from '../../utils/source-tokens.util.ts';

const KEYWORD_VALUES: string[] = ['import', 'require'];

export const labelOf = (token: SourceToken): string => `${token.kind}:${token.value}`;

export const labelsOf = (text: string): string[] => {
  const tokens = sourceTokensOf(text);

  return tokens.map(labelOf);
};

export const isKeywordToken = (token: SourceToken): boolean => token.kind === 'word' && KEYWORD_VALUES.includes(token.value);
