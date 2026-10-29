/**
 * Makes the graph container 1 px shorter with a bottom margin, as a stretched flex item gives its margin up from its
 * height, and resolves at the first callback of a resize observer of its own. That callback comes on the next frame
 * whether or not the size changed, as every `observe` delivers one; by then the margin is laid out, and since observers
 * run in the order they were made, the page's own observer has run. Runs in the page through `evaluate`.
 */
export const shrinkByOnePixel = async (container: Element): Promise<void> => {
  if (!(container instanceof HTMLElement)) throw new Error('graph e2e: the graph container is not an HTML element');

  const observed = new Promise<void>((resolve): void => {
    const observer = new ResizeObserver((): void => {
      observer.disconnect();
      resolve();
    });

    observer.observe(container);
  });

  container.style.marginBottom = '1px';
  await observed;
};
