import type { SourceToken } from '../common/source-token.type.ts';

export const isAnyWord = (token: SourceToken | undefined): boolean => token?.kind === 'word';

export const isPunct = (token: SourceToken | undefined, value: string): boolean => token?.kind === 'punct' && token.value === value;

export const isWord = (token: SourceToken | undefined, value: string): boolean => token?.kind === 'word' && token.value === value;

export const startOf = (tokens: SourceToken[], index: number): number => tokens[index]?.start ?? 0;
