import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { markPredictions, markRuns, taskNodes } from './graph-task-marks.ts';
import { ATOM_FILE_CLASS } from '../common/graph-atom.const.ts';
import { TASK_NODE_CLASS } from '../common/graph-task.const.ts';

const BOX_DATA = { id: 'pkg:a' };

const A_BUILD_DATA = { id: 'a#build', parent: 'pkg:a' };

const B_BUILD_DATA = { id: 'b#build' };

const FILE_DATA = { id: 'a#build:file' };

const BOX: ElementDefinition = { data: BOX_DATA };

const A_BUILD: ElementDefinition = { data: A_BUILD_DATA, classes: TASK_NODE_CLASS };

const B_BUILD: ElementDefinition = { data: B_BUILD_DATA, classes: TASK_NODE_CLASS };

const FILE: ElementDefinition = { data: FILE_DATA, classes: ATOM_FILE_CLASS };

const ELEMENTS: ElementDefinition[] = [BOX, A_BUILD, B_BUILD, FILE];

/** The classes of the element `id` that start with `prefix`. */
const classesOf = (cy: Core, id: string, prefix: string): string[] => {
  const classes = cy.getElementById(id).classes();
  const hasPrefix = (name: string): boolean => name.startsWith(prefix);

  return classes.filter(hasPrefix);
};

const idsOf = (cy: Core): string[] => taskNodes(cy).map((node) => node.id());

describe('FEATURE: task marks', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, elements: ELEMENTS });
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN two tasks, an Atomizer file and a package box', () => {
    it('WHEN the task nodes are read THEN they are the two tasks only', () => {
      expect(idsOf(cy)).toStrictEqual(['a#build', 'b#build']);
    });

    it('WHEN runs name a#build and the file THEN each carries its run class', () => {
      markRuns(cy, { 'a#build': 'running', 'a#build:file': 'passed' });

      const taskClasses = classesOf(cy, 'a#build', 'run-');
      const fileClasses = classesOf(cy, 'a#build:file', 'run-');

      expect([...taskClasses, ...fileClasses]).toStrictEqual(['run-running', 'run-passed']);
    });

    it('WHEN a later runs map omits a#build THEN its run class goes', () => {
      markRuns(cy, { 'a#build': 'running' });
      markRuns(cy, {});

      expect(classesOf(cy, 'a#build', 'run-')).toStrictEqual([]);
    });

    it('WHEN runs name the box THEN the box carries no run class', () => {
      markRuns(cy, { 'pkg:a': 'failed' });

      expect(classesOf(cy, 'pkg:a', 'run-')).toStrictEqual([]);
    });

    it('WHEN a#build is predicted cached THEN it carries predict-cached', () => {
      markPredictions(cy, { 'a#build': 'cached' });

      expect(classesOf(cy, 'a#build', 'predict-')).toStrictEqual(['predict-cached']);
    });

    it('WHEN the file is predicted THEN it carries no predict class', () => {
      markPredictions(cy, { 'a#build:file': 'cached' });

      expect(classesOf(cy, 'a#build:file', 'predict-')).toStrictEqual([]);
    });

    it('WHEN a#build is predicted cached THEN the mark answers that a class changed', () => {
      expect(markPredictions(cy, { 'a#build': 'cached' })).toBe(true);
    });

    it('WHEN the same words are marked a second time THEN the mark answers that nothing changed', () => {
      markPredictions(cy, { 'a#build': 'cached' });

      expect(markPredictions(cy, { 'a#build': 'cached' })).toBe(false);
    });

    it('WHEN nothing is predicted on unmarked tasks THEN the mark answers that nothing changed', () => {
      expect(markPredictions(cy, {})).toBe(false);
    });
  });
});
