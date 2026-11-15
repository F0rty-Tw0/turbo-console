import { describe, expect, it, vi } from 'vitest';

import { hasPackage, revealed } from './panel-package.util.ts';
import { viewMock } from '../../shared/test/mocks/panel-view.mock.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { OpenPanel } from '../common/panel.type.ts';
import { DETAILS_MODEL_STUB } from '../test/stubs/details-model.stub.ts';

const KEY: PanelKey = { root: '/ws', packageName: 'a' };

describe('FEATURE: panel package check', () => {
  describe('GIVEN a package in the model', () => {
    it('WHEN checked THEN it is there', () => {
      expect(hasPackage(DETAILS_MODEL_STUB, 'a')).toBe(true);
    });
  });

  describe.each([
    ['a package the model lacks', DETAILS_MODEL_STUB, 'gone'],
    ['no model', null, 'a'],
    ['no root', undefined, 'a']
  ])('GIVEN %s', (_name, model, packageName) => {
    it('WHEN checked THEN it is not there', () => {
      expect(hasPackage(model, packageName)).toBe(false);
    });
  });
});

describe('FEATURE: revealing a panel', () => {
  describe('GIVEN a panel', () => {
    it('WHEN revealed THEN its tab comes forward and it is returned', () => {
      const fake = viewMock();
      const session = { receive: vi.fn(), publish: vi.fn(), whenIdle: vi.fn(), dispose: vi.fn() };
      const panel: OpenPanel = { key: KEY, view: fake.view, session, posted: [] };

      const result = revealed(panel);

      expect(result).toBe(panel);
      expect(fake.reveal).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN no panel', () => {
    it('WHEN revealed THEN there is nothing to return', () => {
      expect(revealed(null)).toBeNull();
    });
  });
});
