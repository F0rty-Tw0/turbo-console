import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { sharedAtomsOf } from './shared-atoms.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { AtomHostPorts, AtomListener, SharedAtoms } from '../common/atom-load.type.ts';
import { BASE_SPEC_PATHS, FILE_A, PKG, ROOT } from '../test/common/atom-load.const.ts';
import type { LoadsHarness } from '../test/common/atom-load.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, settleOk } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';
import { loadedOf } from '../test/utils/atom-tree.spec.util.ts';

describe('FEATURE: shared atoms', () => {
  let h: LoadsHarness;
  let atoms: SharedAtoms;

  const commitDryRun = async (index: number): Promise<void> => {
    dryRunAt(h, index).resolve([dryStateOf(FILE_A, 'HIT')]);
    await flush();
  };

  beforeEach(() => {
    h = loadsHarness();

    const store = new RootStore();
    const ports: AtomHostPorts = { binaryOf: h.binaryOf, dryRun: h.dryRun, results: h.results, log: h.log };

    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply(ROOT, loadedOf(atomModelOf(BASE_SPEC_PATHS)));
    atoms = sharedAtomsOf(store, ports);
  });

  describe('GIVEN two subscribed listeners', () => {
    let first: Mock<AtomListener>;
    let second: Mock<AtomListener>;

    beforeEach(() => {
      first = vi.fn<AtomListener>();
      second = vi.fn<AtomListener>();
      atoms.onDidChange(first);
      atoms.onDidChange(second);
      atoms.childrenRequested(ROOT, PKG);
    });

    it('WHEN a load of the package commits THEN the first listener hears (root, package) once', async () => {
      await commitDryRun(0);

      expect(first).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
    });

    it('WHEN a load of the package commits THEN the second listener hears (root, package) once', async () => {
      await commitDryRun(0);

      expect(second).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
    });

    it('WHEN disposed THEN a later commit reaches no listener', async () => {
      atoms.dispose();
      atoms.childrenRequested(ROOT, PKG);
      await commitDryRun(1);

      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a first listener that throws and a second listener', () => {
    let second: Mock<AtomListener>;

    beforeEach(() => {
      const first = vi.fn<AtomListener>(() => {
        throw new Error('listener broke');
      });

      second = vi.fn<AtomListener>();
      atoms.onDidChange(first);
      atoms.onDidChange(second);
      atoms.childrenRequested(ROOT, PKG);
    });

    it('WHEN a load of the package commits THEN the second listener hears (root, package) once', async () => {
      await commitDryRun(0);

      expect(second).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
    });

    it('WHEN a load of the package commits THEN the log names the failed listener and its error', async () => {
      await commitDryRun(0);

      expect(h.log).toHaveBeenCalledExactlyOnceWith(`atoms ${ROOT} ${PKG}: listener failed: listener broke`);
    });
  });

  describe('GIVEN a listener that unsubscribed', () => {
    it('WHEN a load of the package commits THEN it hears nothing', async () => {
      const listener = vi.fn<AtomListener>();
      const off = atoms.onDidChange(listener);

      off();
      atoms.childrenRequested(ROOT, PKG);
      await commitDryRun(0);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the children of the package were requested', () => {
    beforeEach(() => {
      atoms.childrenRequested(ROOT, PKG);
    });

    it('WHEN the view is read after the load THEN it is the loads view with the dry-run map set', async () => {
      await settleOk(h, 0);

      const view = atoms.view(ROOT, PKG);

      expect(view.dryRun?.get(FILE_A)).toBe('HIT');
    });

    it('WHEN the children are requested again THEN dryRun ran once', () => {
      atoms.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledOnce();
    });

    it('WHEN disposed THEN the pending load signal is aborted', () => {
      atoms.dispose();

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
    });
  });
});
