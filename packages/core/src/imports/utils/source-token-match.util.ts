import type { SourceToken } from '../common/source-token.type.ts';

export const isPunct = (token: SourceToken | undefined, value: string): boolean => token?.kind === 'punct' && token.value === value;

export const isWord = (token: SourceToken | undefined, value: string): boolean => token?.kind === 'word' && token.value === value;
