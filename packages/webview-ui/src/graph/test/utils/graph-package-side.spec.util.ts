import { vi } from 'vitest';

import type { ModuleControlsElements } from '../../common/module-controls.type.ts';
import type { PackageSideDepsMock } from '../common/graph-package-side.type.ts';
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

/** Makes `instanceof Element` hold for the stubbed fake document's elements, for a spec that clicks into a delegated listener. */
export const stubElementClass = (): void => {
  const probe = document.createElement('span');

  vi.stubGlobal('Element', probe.constructor);
};

/** The module Controls panel the controller built; throws when none was built, so a spec reads it without a guard. */
export const moduleControlsOf = (mock: Pick<PackageSideDepsMock, 'moduleControls'>): ModuleControlsElements => {
  const [built] = mock.moduleControls;

  if (built === undefined) throw new Error('no module Controls were built');

  return built;
};

/** Resolves after the timers queued so far: the package side's first draw has settled. */
export const settled = async (): Promise<void> => {
  const wait = (resolve: () => void): void => {
    setTimeout(resolve, 0);
  };

  return new Promise(wait);
};
