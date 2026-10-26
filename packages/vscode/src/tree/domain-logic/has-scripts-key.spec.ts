import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { trackHasScripts } from './has-scripts-key.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { loadedWith, packageNamed, scriptPackageNamed } from '../test/utils/tree-model.spec.util.ts';

const ROOT = ROOT_FOLDER_STUB.root;

describe('FEATURE: trackHasScripts', () => {
  let store: RootStore;
  let setKey: Mock<(value: boolean) => Promise<void>>;
  let log: Mock<(line: string) => void>;

  const sent = (): boolean[] => setKey.mock.calls.map(([value]) => value);

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    setKey = vi.fn<(value: boolean) => Promise<void>>(async () => Promise.resolve());
    log = vi.fn();
  });

  describe('GIVEN one root with no model', () => {
    it('WHEN tracking starts THEN false is sent once', () => {
      trackHasScripts(store, setKey, log);

      expect(sent()).toStrictEqual([false]);
    });

    it('WHEN a model with a script loads THEN true follows', () => {
      trackHasScripts(store, setKey, log);

      store.apply(ROOT, loadedWith([scriptPackageNamed('s')]));

      expect(sent()).toStrictEqual([false, true]);
    });

    it('WHEN a model with only turbo tasks loads twice THEN nothing more is sent', () => {
      trackHasScripts(store, setKey, log);

      store.apply(ROOT, loadedWith([packageNamed('a')]));
      store.apply(ROOT, loadedWith([packageNamed('a'), packageNamed('b')]));

      expect(sent()).toStrictEqual([false]);
    });

    it('WHEN a reload drops the last script THEN false follows true', () => {
      trackHasScripts(store, setKey, log);

      store.apply(ROOT, loadedWith([scriptPackageNamed('s')]));
      store.apply(ROOT, loadedWith([packageNamed('a')]));

      expect(sent()).toStrictEqual([false, true, false]);
    });

    it('WHEN the only root with scripts is removed and refresh is called THEN false follows true', () => {
      const tracker = trackHasScripts(store, setKey, log);

      store.apply(ROOT, loadedWith([scriptPackageNamed('s')]));
      store.set([], coordinatorMock);
      tracker.refresh();

      expect(sent()).toStrictEqual([false, true, false]);
    });

    describe('WHEN disposed', () => {
      it('THEN later loads and refreshes send nothing', () => {
        const tracker = trackHasScripts(store, setKey, log);

        tracker.dispose();
        store.apply(ROOT, loadedWith([scriptPackageNamed('s')]));
        tracker.refresh();

        expect(sent()).toStrictEqual([false]);
      });

      it('THEN the store listener is unsubscribed once', () => {
        const unsubscribe = vi.fn();

        vi.spyOn(store, 'onDidChange').mockReturnValue(unsubscribe);
        const tracker = trackHasScripts(store, setKey, log);

        tracker.dispose();

        expect(unsubscribe).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN setKey rejects its first send', () => {
    beforeEach(() => {
      setKey.mockRejectedValueOnce(new Error('boom'));
    });

    it('WHEN tracking starts THEN the rejection is logged and the next refresh sends again', async () => {
      const tracker = trackHasScripts(store, setKey, log);

      await vi.waitFor(() => {
        expect(log).toHaveBeenCalledOnce();
      });
      tracker.refresh();

      expect(sent()).toStrictEqual([false, false]);
    });
  });
});
