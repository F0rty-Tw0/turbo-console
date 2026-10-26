import type { SingularElementArgument } from 'cytoscape';

/**
 * Leaves `element` with exactly the classes of `wanted` among `among`, and writes only when they differ: Cytoscape
 * restyles an element on every `removeClass`, even of a class it lacks, so a blind rewrite restyles the whole graph.
 */
export const setClassesAmong = (element: SingularElementArgument, among: string[], wanted: string[]): void => {
  const isWantedState = (name: string): boolean => element.hasClass(name) === wanted.includes(name);
  const isSame = among.every(isWantedState);

  if (isSame) return;

  element.removeClass(among).addClass(wanted);
};
