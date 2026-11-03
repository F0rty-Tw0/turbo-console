import { describe, expect, it } from 'vitest';

import {
  chooseFolderLabelOf,
  chooseProjectLabelOf,
  chooseTaskLabelOf,
  droppedTasksText,
  showEveryTextOf,
  tasksHiddenText
} from './task-text.util.ts';

describe('FEATURE: task text', () => {
  it('GIVEN 400 tasks cut by the cap WHEN the banner text is made THEN it reads 400 tasks hidden', () => {
    const text = tasksHiddenText(400);

    expect(text).toBe('400 tasks hidden');
  });

  it('GIVEN 2 chosen ids not in the tasks WHEN the notice is made THEN it reads 2 chosen tasks no longer exist', () => {
    const text = droppedTasksText(2);

    expect(text).toBe('2 chosen tasks no longer exist');
  });

  it('GIVEN 6 known tasks WHEN the Show every task text is made THEN the count is in the text', () => {
    const text = showEveryTextOf(6);

    expect(text).toBe('Show every task (6)');
  });

  it('GIVEN the folder apps WHEN its check label is made THEN it reads Choose tasks of folder apps', () => {
    const label = chooseFolderLabelOf('apps');

    expect(label).toBe('Choose tasks of folder apps');
  });

  it('GIVEN the project web WHEN its check label is made THEN it reads Choose tasks of web', () => {
    const label = chooseProjectLabelOf('web');

    expect(label).toBe('Choose tasks of web');
  });

  it('GIVEN the task web#build WHEN its check label is made THEN it reads Choose web#build', () => {
    const label = chooseTaskLabelOf('web#build');

    expect(label).toBe('Choose web#build');
  });
});
