import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PanelTitle } from './panel-title.ts';
import { A_PACKAGE_STUB, DETAILS_MODEL_STUB } from '../test/stubs/details-model.stub.ts';

const LABELLED_PACKAGE = { ...A_PACKAGE_STUB, label: 'single-app' };
const LABELLED = { ...DETAILS_MODEL_STUB, packages: [LABELLED_PACKAGE] };
const EMPTY = { ...DETAILS_MODEL_STUB, packages: [] };

describe('FEATURE: panel title', () => {
  let setTitle: (title: string) => void;
  let title: PanelTitle;

  beforeEach(() => {
    setTitle = vi.fn();
    title = new PanelTitle('a', setTitle);
  });

  describe('GIVEN a package never seen', () => {
    it('WHEN synced with a model lacking it THEN the title is the package name and there is no last label', () => {
      title.sync(EMPTY);

      expect(setTitle).toHaveBeenLastCalledWith('Package Details: a');
      expect(title.lastLabel).toBeNull();
    });
  });

  describe('GIVEN a package seen with a label', () => {
    beforeEach(() => {
      title.sync(LABELLED);
    });

    it('WHEN synced THEN the title and the last label are the label', () => {
      expect(setTitle).toHaveBeenLastCalledWith('Package Details: single-app');
      expect(title.lastLabel).toBe('single-app');
    });

    it('WHEN it then leaves the model THEN both keep the label', () => {
      title.sync(EMPTY);

      expect(setTitle).toHaveBeenLastCalledWith('Package Details: single-app');
      expect(title.lastLabel).toBe('single-app');
    });

    it('WHEN the root has no model THEN both keep the label', () => {
      title.sync(null);

      expect(setTitle).toHaveBeenLastCalledWith('Package Details: single-app');
    });
  });
});
