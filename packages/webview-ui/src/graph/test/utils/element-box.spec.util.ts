/** Gives `element` the box a layout would: its left edge, width and height in px, replaceable by a later call. */
export const setBox = (element: HTMLElement, left: number, width: number, height: number): void => {
  Object.defineProperty(element, 'offsetLeft', { value: left, configurable: true });
  Object.defineProperty(element, 'offsetWidth', { value: width, configurable: true });
  Object.defineProperty(element, 'offsetHeight', { value: height, configurable: true });
};
