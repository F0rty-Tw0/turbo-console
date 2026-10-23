import type { Mocked } from 'vitest';
import { vi } from 'vitest';

import type { TaskPanel } from '../../common/graph-task.type.ts';
import type { TaskControls } from '../../common/task-controls.type.ts';
import type { TaskDetails } from '../../common/task-details.type.ts';

export const taskPanelMock = (): Mocked<TaskPanel> => {
  const panel: Mocked<TaskPanel> = {
    enter: vi.fn<TaskPanel['enter']>(),
    exit: vi.fn<TaskPanel['exit']>(),
    show: vi.fn<TaskPanel['show']>(),
    notice: vi.fn<TaskPanel['notice']>()
  };

  return panel;
};

export const taskControlsMock = (): Mocked<TaskControls> => {
  const controls: Mocked<TaskControls> = {
    enter: vi.fn<TaskControls['enter']>(),
    exit: vi.fn<TaskControls['exit']>(),
    setRows: vi.fn<TaskControls['setRows']>()
  };

  return controls;
};

export const taskDetailsMock = (): Mocked<TaskDetails> => {
  const details: Mocked<TaskDetails> = {
    enter: vi.fn<TaskDetails['enter']>(),
    exit: vi.fn<TaskDetails['exit']>(),
    show: vi.fn<TaskDetails['show']>()
  };

  return details;
};
