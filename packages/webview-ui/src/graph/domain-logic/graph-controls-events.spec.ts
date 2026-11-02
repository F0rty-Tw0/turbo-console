import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { wireControls } from './graph-controls-events.ts';
import { renderLabels } from './graph-controls-render.ts';
import type { ControlsElements } from '../common/controls-elements.type.ts';
import type { ControlsActions } from '../common/graph-controls.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';
import { boardsControlsMock } from '../test/mocks/boards-controls.mock.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { BOARDS_DRAWN } from '../test/utils/folder-boards.spec.util.ts';

type ScopeRig = {
  readonly elements: ControlsElements;
  readonly onScope: Mock<ControlsActions['onScope']>;
};

const wiredScopeRig = (): ScopeRig => {
  const elements = boardsControlsMock();
  const onScope = vi.fn<ControlsActions['onScope']>();
  const actions: ControlsActions = {
    onRow: vi.fn(),
    onGroup: vi.fn(),
    onFocus: vi.fn(),
    onDepth: vi.fn(),
    onDepthBlur: vi.fn(),
    onGrouping: vi.fn(),
    onToggle: vi.fn(),
    onFolderFocus: vi.fn(),
    onTag: vi.fn(),
    onShowAll: vi.fn(),
    onSearch: vi.fn(),
    onPick: vi.fn(),
    onScope
  };

  wireControls(elements, actions);

  const rig: ScopeRig = { elements, onScope };

  return rig;
};

describe('FEATURE: wireControls Show package scopes', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the boards panel wired', () => {
    it('WHEN the user ticks the box THEN onScope is called once with the checked value', () => {
      const { elements, onScope } = wiredScopeRig();

      elements.scope.checked = true;
      elements.scope.dispatchEvent(new Event('input'));

      expect(onScope).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('WHEN the user unticks the box THEN onScope is called once with false', () => {
      const { elements, onScope } = wiredScopeRig();

      elements.scope.checked = false;
      elements.scope.dispatchEvent(new Event('input'));

      expect(onScope).toHaveBeenCalledExactlyOnceWith(false);
    });

    it('WHEN renderLabels syncs the box from a state THEN onScope is not called', () => {
      const { elements, onScope } = wiredScopeRig();
      const graph: DrawnGraph = { ...BOARDS_DRAWN, scopeShown: false };

      renderLabels(elements, graph);

      expect(onScope).not.toHaveBeenCalled();
    });
  });
});
