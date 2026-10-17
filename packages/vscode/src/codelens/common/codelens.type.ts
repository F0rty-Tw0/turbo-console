import type { TextDocument } from 'vscode';

/** One CodeLens as the pure side decides it: the line it sits on and its title. */
export type LensSpec = {
  readonly line: number;
  readonly title: string;
};

/** The part of a `TextDocument` the lens provider reads. */
export type LensDocument = Pick<TextDocument, 'uri' | 'getText'>;
