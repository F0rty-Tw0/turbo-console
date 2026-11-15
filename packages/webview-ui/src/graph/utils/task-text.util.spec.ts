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
  describe('GIVEN 400 tasks cut by the cap', () => {
    it('WHEN the banner text is made THEN it reads 400 tasks hidden', () => {
      const text = tasksHiddenText(400);

      expect(text).toBe('400 tasks hidden');
    });
  });

  describe('GIVEN 2 chosen ids not in the tasks', () => {
    it('WHEN the notice is made THEN it reads 2 chosen tasks no longer exist', () => {
      const text = droppedTasksText(2);

      expect(text).toBe('2 chosen tasks no longer exist');
    });
  });

  describe('GIVEN 6 known tasks', () => {
    it('WHEN the Show every task text is made THEN the count is in the text', () => {
      const text = showEveryTextOf(6);

      expect(text).toBe('Show every task (6)');
    });
  });

  describe('GIVEN the folder apps', () => {
    it('WHEN its check label is made THEN it reads Choose tasks of folder apps', () => {
      const label = chooseFolderLabelOf('apps');

      expect(label).toBe('Choose tasks of folder apps');
    });
  });

  describe('GIVEN the project web', () => {
    it('WHEN its check label is made THEN it reads Choose tasks of web', () => {
      const label = chooseProjectLabelOf('web');

      expect(label).toBe('Choose tasks of web');
    });
  });

  describe('GIVEN the task web#build', () => {
    it('WHEN its check label is made THEN it reads Choose web#build', () => {
      const label = chooseTaskLabelOf('web#build');

      expect(label).toBe('Choose web#build');
    });
  });
});
