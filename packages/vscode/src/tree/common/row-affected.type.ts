/** `word` is `null` while a run owns the description slot: then only the tooltip `line` is added. */
export type RowAffected = { readonly word: string | null; readonly line: string };
