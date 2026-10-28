/** Matches a class list holding the Codicon class of `id` as a whole word, so `eye` never matches `eye-closed`. */
export const codiconClassOf = (id: string): RegExp => new RegExp(`(^|\\s)codicon-${id}(\\s|$)`);
