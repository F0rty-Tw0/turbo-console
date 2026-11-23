import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';

/** The stub container's size in px, so `cy.extent()` is finite. */
const CONTAINER_WIDTH = 800;

const CONTAINER_HEIGHT = 600;

const noop = (): void => undefined;

/** A 2D context whose every method is a no-op; no spec reads a pixel. */
const CONTEXT = new Proxy({}, { get: (): typeof noop => noop });

const styleless = (): object => {
  const style = {};
  const element = { style, className: '', appendChild: noop, setAttribute: noop, getContext: (): object => CONTEXT };

  return element;
};

const HEAD = { children: [], insertBefore: noop };

const DOCUMENT = { createElement: styleless, getElementById: (): null => null, head: HEAD };

/** `position` for the renderer's container check; `0` for the paddings `cy.size()` subtracts. */
const propertyValueOf = (name: string): string => (name === 'position' ? 'relative' : '0');

const COMPUTED_STYLE = { getPropertyValue: propertyValueOf };

/** The window Cytoscape reads through `container.ownerDocument.defaultView`: just enough to build a canvas renderer. */
const WINDOW = { document: DOCUMENT, getComputedStyle: (): typeof COMPUTED_STYLE => COMPUTED_STYLE };

const OWNER_DOCUMENT = { defaultView: WINDOW };

/** `value` when it is an object; throws naming `what` otherwise. */
export const objectOf = (value: unknown, what: string): object => {
  if (typeof value !== 'object' || value === null) throw new Error(`spec: no ${what}`);

  return value;
};

/** A headless `cy` whose container is the stub element, so `cy.window()` is `WINDOW`; its typings want an HTMLElement. */
const attachContainer = (cy: Core): void => {
  const element = styleless();
  const childNodes: object[] = [];
  const container = {
    ...element,
    childNodes,
    ownerDocument: OWNER_DOCUMENT,
    clientWidth: CONTAINER_WIDTH,
    clientHeight: CONTAINER_HEIGHT
  };
  const internals = objectOf(Reflect.get(cy, '_private'), 'core internals');

  Reflect.set(internals, 'container', container);
  Reflect.set(internals, 'sizeCache', null);
};

/** Cytoscape's real canvas renderer on `cy`, over an 800 x 600 stub container; untyped like its internals. */
export const canvasRendererOf = (cy: Core): object => {
  const canvasRenderer = cytoscape('renderer', 'canvas');

  attachContainer(cy);

  if (typeof canvasRenderer !== 'function') throw new Error('spec: no canvas renderer');
  const renderer: unknown = Reflect.construct(canvasRenderer, [{ cy }]);

  return objectOf(renderer, 'renderer');
};
