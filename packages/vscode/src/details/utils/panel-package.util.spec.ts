import { describe, expect, it, vi } from 'vitest';

import { hasPackage, revealed } from './panel-package.util.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { OpenPanel } from '../common/panel.type.ts';
import { viewMock } from '../test/mocks/panel-host.mock.ts';
import { DETAILS_MODEL_STUB } from '../test/stubs/details-model.stub.ts';

const KEY: PanelKey = { root: '/ws', packageName: 'a' };

describe('FEATURE: panel package check', () => {
  it('GIVEN a package in the model WHEN checked THEN it is there', () => {
    expect(hasPackage(DETAILS_MODEL_STUB, 'a')).toBe(true);
  });

  it.each([
    ['a package the model lacks', DETAILS_MODEL_STUB, 'gone'],
    ['no model', null, 'a'],
    ['no root', undefined, 'a']
  ])('GIVEN %s WHEN checked THEN it is not there', (_name, model, packageName) => {
    expect(hasPackage(model, packageName)).toBe(false);
  });
});

describe('FEATURE: revealing a panel', () => {
  it('GIVEN a panel WHEN revealed THEN its tab comes forward and it is returned', () => {
    const fake = viewMock();
    const session = { receive: vi.fn(), publish: vi.fn(), whenIdle: vi.fn(), dispose: vi.fn() };
    const panel: OpenPanel = { key: KEY, view: fake.view, session, posted: [] };

    const result = revealed(panel);

    expect(result).toBe(panel);
    expect(fake.reveal).toHaveBeenCalledOnce();
  });

  it('GIVEN no panel WHEN revealed THEN there is nothing to return', () => {
    expect(revealed(null)).toBeNull();
  });
});
