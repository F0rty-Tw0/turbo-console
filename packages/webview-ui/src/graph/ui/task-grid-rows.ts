import { gridCell, gridLine, listButton, listCheck } from './controls-list-parts.ts';
import { graphIcon } from './graph-icon.ts';
import type { GroupLine, ProjectLine, TaskGridRow, TaskLine } from '../common/task-grid.type.ts';

const checkOf = (line: ProjectLine): HTMLInputElement => {
  const check = listCheck(line.label);

  if (line.kind === 'task') {
    check.checked = line.isChecked;

    return check;
  }

  check.checked = line.state === 'checked';
  check.indeterminate = line.state === 'mixed';

  return check;
};

const groupNameOf = (line: GroupLine): HTMLButtonElement => {
  const name = listButton('controls-name', line.text);
  const chevron = graphIcon(line.isOpen ? 'chevron-down' : 'chevron-right');

  name.prepend(chevron);
  name.setAttribute('aria-expanded', String(line.isOpen));

  return name;
};

/** The task's name button: its `title` keeps the full id when CSS cuts the name, and an undrawn task's name is inert. */
const taskNameOf = (line: TaskLine): HTMLButtonElement => {
  const { task, isDrawn } = line;
  const name = listButton('controls-name', task.name);

  name.title = task.id;

  if (!isDrawn) name.setAttribute('aria-disabled', 'true');

  return name;
};

const nameOf = (line: ProjectLine): HTMLButtonElement => {
  if (line.kind === 'task') return taskNameOf(line);

  return groupNameOf(line);
};

/**
 * One Projects grid row, painted from `line`: a check (a mixed group is unchecked and indeterminate, so activating it
 * checks all) and a name button, both out of the Tab order because the grid is one Tab stop. Painting sets properties,
 * which fire no event.
 */
export const buildProjectLine = (line: ProjectLine): TaskGridRow => {
  const check = checkOf(line);
  const name = nameOf(line);
  const element = gridLine('controls-row', [gridCell(check), gridCell(name)]);
  const isDimmed = line.kind === 'task' && !line.isDrawn;

  element.dataset['kind'] = line.kind;
  element.dataset['depth'] = String(line.depth);

  if (isDimmed) element.classList.add('is-dimmed');

  const row: TaskGridRow = { line, element, check, name };

  return row;
};
