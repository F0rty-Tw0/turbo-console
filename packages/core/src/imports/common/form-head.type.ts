import type { ImportForm } from './import-form.type.ts';

export type ClauseKind = Extract<ImportForm['kind'], 'static' | 'reexport'>;

export type FormHead = {
  readonly kind: ClauseKind;
  readonly isModifier: boolean;
  readonly start: number;
};
