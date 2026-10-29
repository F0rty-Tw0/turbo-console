import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { layoutScreenOf, showFailure, showStateMessage } from './graph-page-states.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { pageMock } from '../test/mocks/page.mock.ts';

const LOADING_STATE = { kind: 'loading' } as const;

describe('FEATURE: layoutScreenOf', () => {
  let page: PageElements;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    page = pageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the Legend popover is open', () => {
    beforeEach(() => {
      page.legendPanel.showPopover();
    });

    it.each([
      ['a loading state', (): void => showStateMessage(page, LOADING_STATE)],
      ['the layout loading', (): void => layoutScreenOf(page).showLoading()],
      ['a page failure', (): void => showFailure(page, new Error('boom'))]
    ])('WHEN %s shows THEN the popover is closed', (_label, show) => {
      show();

      expect(page.legendPanel.matches(':popover-open')).toBe(false);
    });
  });

  describe('GIVEN the pre-state', () => {
    it('WHEN the graph shows THEN the Legend button is enabled', () => {
      layoutScreenOf(page).showGraph(false);

      expect(page.legend.disabled).toBe(false);
    });

    it('WHEN built THEN the location bar sits right before the body and is hidden', () => {
      const children = Array.from(page.root.children);
      const bodyIndex = children.indexOf(page.body);

      expect(children[bodyIndex - 1]).toBe(page.location.nav);
      expect(page.location.nav.hidden).toBe(true);
    });

    it('WHEN the graph shows THEN the location bar shows with the body', () => {
      layoutScreenOf(page).showGraph(false);

      expect([page.location.nav.hidden, page.body.hidden]).toStrictEqual([false, false]);
    });
  });

  describe('GIVEN the graph shown', () => {
    beforeEach(() => {
      layoutScreenOf(page).showGraph(false);
    });

    it.each([
      ['a loading state', (): void => showStateMessage(page, LOADING_STATE)],
      ['a page failure', (): void => showFailure(page, new Error('boom'))]
    ])('WHEN %s shows THEN the location bar hides with the body', (_label, show) => {
      show();

      expect([page.location.nav.hidden, page.body.hidden]).toStrictEqual([true, true]);
    });
  });

  describe('GIVEN the loading screen hid a body that held focus', () => {
    beforeEach(() => {
      const screen = layoutScreenOf(page);

      page.container.focus();
      screen.showLoading();
      document.body.focus();
    });

    it('WHEN the graph shows THEN the container has focus', () => {
      layoutScreenOf(page).showGraph(false);

      expect(document.activeElement).toBe(page.container);
    });

    it('WHEN focus moved to the Controls button before the graph shows THEN it stays there', () => {
      page.controls.focus();
      layoutScreenOf(page).showGraph(false);

      expect(document.activeElement).toBe(page.controls);
    });
  });

  describe('GIVEN the loading screen hid a body that held focus while the page had none, as when the editor saves', () => {
    it('WHEN the graph shows THEN focus stays on the body', () => {
      vi.spyOn(document, 'hasFocus').mockReturnValue(false);
      page.container.focus();
      layoutScreenOf(page).showLoading();
      document.body.focus();
      layoutScreenOf(page).showGraph(false);

      expect(document.activeElement).toBe(document.body);
    });
  });

  describe('GIVEN the loading screen hid a body that held no focus', () => {
    it('WHEN the graph shows THEN focus stays on the body', () => {
      page.details.focus();
      layoutScreenOf(page).showLoading();
      document.body.focus();
      layoutScreenOf(page).showGraph(false);

      expect(document.activeElement).toBe(document.body);
    });
  });
});
