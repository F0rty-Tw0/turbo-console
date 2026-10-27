import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hadFocusOf } from './graph-details-render.ts';
import type { ShownInspection } from '../common/graph-details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const NOTHING: ShownInspection = { kind: 'none' };

const CORE: ShownInspection = { kind: 'package', name: 'core' };

describe('FEATURE: hadFocusOf', () => {
  let aside: HTMLElement;
  let content: HTMLElement;
  let clear: HTMLButtonElement;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    aside = document.createElement('aside');
    content = document.createElement('div');
    clear = document.createElement('button');
    aside.append(clear, content);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GIVEN focus on a button in the content WHEN core is shown THEN the view takes focus', () => {
    const button = document.createElement('button');

    content.append(button);
    button.focus();

    expect(hadFocusOf(content, clear, CORE)).toBe(true);
  });

  it('GIVEN focus on Clear selection WHEN core is shown THEN Clear keeps focus', () => {
    clear.focus();

    expect(hadFocusOf(content, clear, CORE)).toBe(false);
  });

  it('GIVEN focus on Clear selection WHEN nothing is shown THEN the Empty view takes focus', () => {
    clear.focus();

    expect(hadFocusOf(content, clear, NOTHING)).toBe(true);
  });

  it('GIVEN focus outside the aside WHEN nothing is shown THEN focus stays put', () => {
    const search = document.createElement('input');

    search.focus();

    expect(hadFocusOf(content, clear, NOTHING)).toBe(false);
  });
});
