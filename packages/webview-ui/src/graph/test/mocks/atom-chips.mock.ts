import { vi } from 'vitest';

import type { AtomChipsPort } from '../../common/atom-chips.type.ts';

/** A layer stub with the calls the chip rows make on it; it holds no children, as the node test environment has no DOM. */
const layerMock = (): HTMLElement => {
  const layer = { append: vi.fn(), replaceChildren: vi.fn(), children: [] };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- a stub of the members the chip rows touch
  const element: HTMLElement = Object.assign(Object.create(null), layer);

  return element;
};

/** A row stub a style and dataset are written to and that can be removed. */
const rowMock = (): HTMLElement => {
  const row = { style: {}, dataset: {}, remove: vi.fn() };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- a stub of the members the chip rows touch
  const element: HTMLElement = Object.assign(Object.create(null), row);

  return element;
};

/** The chip rows' port: `layer` and `rowOf` as given, else stubs that need no `document`. */
export const atomChipsMock = (layer = layerMock(), rowOf: AtomChipsPort['rowOf'] = rowMock): AtomChipsPort => {
  const port: AtomChipsPort = { layer, rowOf };

  return port;
};
