import type { SingularElementArgument } from 'cytoscape';

/** Cytoscape's renderer calls `activate` on a press; it exists at runtime but not in the typings, which only know `active`. */
type Pressable = {
  readonly activate: () => void;
};

const isPressable = (element: object): element is Pressable => 'activate' in element && typeof element.activate === 'function';

/** Presses `element` the way the renderer does, so its `:active` style applies. */
export const pressOf = (element: SingularElementArgument): void => {
  if (!isPressable(element)) throw new Error('element cannot be pressed');

  element.activate();
};
