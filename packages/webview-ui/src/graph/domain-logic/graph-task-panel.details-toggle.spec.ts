import { describe, expect, it, vi } from 'vitest';

import { saveDetailsToggle } from './graph-task-panel.ts';
import { taskWidgetsMock } from '../test/mocks/graph-task-mode.mock.ts';

describe('FEATURE: saveDetailsToggle', () => {
  it.each([
    { detailsOpen: true, keeps: 1 },
    { detailsOpen: false, keeps: 0 }
  ])(
    'WHEN the task Details panel turns open $detailsOpen THEN it re-measures, saves and keeps clear $keeps times',
    ({ detailsOpen, keeps }) => {
      const view = { resize: vi.fn() };
      const modes = { savePanels: vi.fn() };
      const deps = { view, modes };
      const widgets = taskWidgetsMock();

      saveDetailsToggle(deps, widgets, detailsOpen);

      expect(deps.view.resize).toHaveBeenCalledOnce();
      expect(deps.modes.savePanels).toHaveBeenCalledExactlyOnceWith({ detailsOpen });
      expect(widgets.keepClear).toHaveBeenCalledTimes(keeps);
    }
  );
});
