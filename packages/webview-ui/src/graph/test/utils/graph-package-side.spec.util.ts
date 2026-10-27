import { vi } from 'vitest';

import { fakeDocumentMock } from '../mocks/fake-document.mock.ts';

const ignore = (): void => undefined;

/** A class no fake element is an instance of, and whose instances observe nothing. */
class NoDomClass {
  public readonly observe = ignore;
}

/** The fake `document`, and every DOM class the package side names: no observer observes, no `instanceof` holds. */
export const stubPackageSideGlobals = (): void => {
  vi.stubGlobal('document', fakeDocumentMock());

  for (const name of ['ResizeObserver', 'MutationObserver', 'Node', 'Element', 'HTMLElement', 'HTMLButtonElement'])
    vi.stubGlobal(name, NoDomClass);
};

/** Resolves after the timers queued so far: the package side's first draw has settled. */
export const settled = async (): Promise<void> => {
  const wait = (resolve: () => void): void => {
    setTimeout(resolve, 0);
  };

  return new Promise(wait);
};
