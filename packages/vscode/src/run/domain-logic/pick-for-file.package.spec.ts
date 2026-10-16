import { TurboException } from '@turbo-console/core';
import type { TurboErrorKind } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { packageOfFile } from './pick-for-file.ts';
import type { LoadFailure, RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { PACKAGE_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import { NOT_PACKAGE_TEXT } from '../common/picker.const.ts';
import type { PickerFakes } from '../test/common/picker-fakes.type.ts';
import { pickerFakes } from '../test/utils/picker-ports.spec.util.ts';

const ONE: RootFolder = { root: '/one', name: 'one' };
const TWO: RootFolder = { root: '/two', name: 'two' };

const NOT_A_ROOT: RootFolder = { root: '/plain', name: 'plain' };

const FILE = '/one/packages/a/package.json';

const failureOf = (kind: TurboErrorKind): LoadFailure => {
  const failure: LoadFailure = { kind: 'error', stage: 'binary', error: new TurboException(kind, 'detail') };

  return failure;
};

describe('FEATURE: the package a manifest file holds', () => {
  let roots: RootStore;
  let fakes: PickerFakes;

  beforeEach(() => {
    roots = new RootStore();
    roots.set([ONE, TWO], coordinatorMock);
    fakes = pickerFakes([ONE, TWO]);
    roots.apply('/one', loadedWith([PACKAGE_NODE_STUB]));
  });

  describe('GIVEN no file, a file in no root, or a root with no entry', () => {
    it('WHEN there is no file THEN it says the file is not a package and finds none', async () => {
      const found = await packageOfFile(roots, fakes.ports, null, true);

      expect(found).toBeNull();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    });

    it('WHEN the file is in no workspace folder THEN it says so and loads nothing', async () => {
      const found = await packageOfFile(roots, fakes.ports, '/elsewhere/package.json', true);

      expect(found).toBeNull();
      expect(fakes.ensureLoaded).not.toHaveBeenCalled();
    });

    it('WHEN the folder is no turbo root THEN it says so and loads nothing', async () => {
      const plain = pickerFakes([ONE, NOT_A_ROOT]);

      const found = await packageOfFile(roots, plain.ports, '/plain/a/package.json', true);

      expect(found).toBeNull();
      expect(plain.ensureLoaded).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a loaded root', () => {
    it('WHEN the file is a package manifest THEN it finds the root and the package, with no message', async () => {
      const found = await packageOfFile(roots, fakes.ports, FILE, true);

      expect(found).toStrictEqual({ root: '/one', pkg: PACKAGE_NODE_STUB });
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN the file matches no package THEN it says the file is not a package', async () => {
      const found = await packageOfFile(roots, fakes.ports, '/one/packages/none/package.json', true);

      expect(found).toBeNull();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    });

    it('WHEN the root is in a binary error THEN it shows that error text', async () => {
      roots.apply('/one', failureOf('not-found'));

      const found = await packageOfFile(roots, fakes.ports, FILE, true);

      expect(found).toBeNull();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(MESSAGE_TEXTS['binary-not-found']);
    });

    it('WHEN the root is in a binary error and that error is not a reason to refuse THEN the kept model still finds the package', async () => {
      roots.apply('/one', failureOf('not-found'));

      const found = await packageOfFile(roots, fakes.ports, FILE, false);

      expect(found).toStrictEqual({ root: '/one', pkg: PACKAGE_NODE_STUB });
      expect(fakes.info).not.toHaveBeenCalled();
    });
  });
});
