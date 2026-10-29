import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { placeToolbarRoot, releaseFocusOf } from './node-toolbar-place.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';
import { rectOf } from '../test/utils/rect.spec.util.ts';

describe('FEATURE: releaseFocusOf', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('GIVEN focus on a button inside the root WHEN it is released THEN the container has focus', () => {
    const { root, focus } = widgetRowViewsMock().views.packageToolbar('web', null);
    const container = document.createElement('div');

    focus.focus();
    releaseFocusOf(root, container);

    expect(document.activeElement).toBe(container);
  });

  it('GIVEN focus elsewhere WHEN it is released THEN focus stays there', () => {
    const { root } = widgetRowViewsMock().views.packageToolbar('web', null);
    const container = document.createElement('div');
    const other = document.createElement('button');

    other.focus();
    releaseFocusOf(root, container);

    expect(document.activeElement).toBe(other);
  });
});

describe('FEATURE: placeToolbarRoot', () => {
  let root: HTMLElement;
  let focus: HTMLButtonElement;
  let container: HTMLElement;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    ({ root, focus } = widgetRowViewsMock().views.packageToolbar('web', null));
    container = document.createElement('div');
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('GIVEN a rect WHEN the root is placed THEN it shows at the rect on whole px', () => {
    placeToolbarRoot(root, rectOf(156.4, 22.6, 180, 46), container);

    expect(root.hidden).toBe(false);
    expect(root.style.transform).toBe('translate(156px, 23px)');
  });

  it('GIVEN a shown root with focus inside WHEN it is placed at null THEN it hides and the container has focus', () => {
    placeToolbarRoot(root, rectOf(156, 22, 180, 46), container);
    focus.focus();

    placeToolbarRoot(root, null, container);

    expect(root.hidden).toBe(true);
    expect(document.activeElement).toBe(container);
  });
});
