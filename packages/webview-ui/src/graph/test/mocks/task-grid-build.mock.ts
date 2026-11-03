import type { ProjectLine, TaskGridRow } from '../../common/task-grid.type.ts';
import { buildProjectLine } from '../../ui/task-grid-rows.ts';

/** The real row builder, for a `domain-logic` spec that may not import `ui` itself. */
export const taskGridBuildMock = (line: ProjectLine): TaskGridRow => buildProjectLine(line);
