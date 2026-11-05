import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { markFolderRuns, markPackageRuns } from './graph-run-marks.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import type { PackageRuns } from '../common/graph-page.type.ts';
import { FOLDER_NODE_CLASS } from '../common/graph.const.ts';
import { classesOf } from '../test/utils/run-marks.spec.util.ts';
import { collapsedIdOf, folderIdOf } from '../utils/folder-id.util.ts';

const APPS_NODE = collapsedIdOf('apps');

const WEB_DATA = { id: 'web' };

const UI_DATA = { id: 'ui' };

const APPS_DATA = { id: APPS_NODE };

const WEB: ElementDefinition = { data: WEB_DATA };

const UI: ElementDefinition = { data: UI_DATA };

const APPS: ElementDefinition = { data: APPS_DATA, classes: FOLDER_NODE_CLASS };

const MEMBERS: ReadonlyMap<string, string[]> = new Map([['apps', ['web', 'docs']]]);

const runsOf = (...entries: [string, GraphRunState][]): PackageRuns => new Map(entries);

const styleEventsDuring = (cy: Core, write: () => void): number => {
  let count = 0;

  cy.on('style', (): void => void count++);
  write();

  return count;
};

describe('FEATURE: markPackageRuns and markFolderRuns', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: [WEB, UI, APPS] });
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN package nodes web and ui and a collapsed folder node apps holding web and docs', () => {
    it('WHEN web runs THEN web has run-running and package-run', () => {
      markPackageRuns(cy, runsOf(['web', 'running']));

      expect(classesOf(cy, 'web')).toStrictEqual(['run-running', 'package-run']);
    });

    it('WHEN web runs THEN ui has no run class', () => {
      markPackageRuns(cy, runsOf(['web', 'running']));

      expect(classesOf(cy, 'ui')).toStrictEqual([]);
    });

    it('WHEN web turns passed THEN run-running is gone and run-passed is set', () => {
      markPackageRuns(cy, runsOf(['web', 'running']));
      markPackageRuns(cy, runsOf(['web', 'passed']));

      expect(classesOf(cy, 'web')).toStrictEqual(['run-passed', 'package-run']);
    });

    it('WHEN the map turns empty THEN web has no run class and no package-run', () => {
      markPackageRuns(cy, runsOf(['web', 'running']));
      markPackageRuns(cy, runsOf());

      expect(classesOf(cy, 'web')).toStrictEqual([]);
    });

    it('WHEN the same map is marked twice THEN the second pass fires no style event', () => {
      const runs = runsOf(['web', 'failed']);

      markPackageRuns(cy, runs);

      const events = styleEventsDuring(cy, (): void => markPackageRuns(cy, runs));

      expect(events).toBe(0);
    });

    it('WHEN web runs and docs passed THEN the apps node reads run-running and package-run', () => {
      markFolderRuns(cy, MEMBERS, runsOf(['web', 'running'], ['docs', 'passed']));

      expect(classesOf(cy, APPS_NODE)).toStrictEqual(['run-running', 'package-run']);
    });

    it('WHEN the folder has no member with a state THEN the apps node has no run class', () => {
      markFolderRuns(cy, MEMBERS, runsOf(['ui', 'running']));

      expect(classesOf(cy, APPS_NODE)).toStrictEqual([]);
    });

    it('WHEN the same folder map is marked twice THEN the second pass fires no style event', () => {
      const runs = runsOf(['web', 'running']);

      markFolderRuns(cy, MEMBERS, runs);

      const events = styleEventsDuring(cy, (): void => markFolderRuns(cy, MEMBERS, runs));

      expect(events).toBe(0);
    });

    it('WHEN a package turns idle THEN markPackageRuns leaves the apps node alone', () => {
      markFolderRuns(cy, MEMBERS, runsOf(['web', 'running']));
      markPackageRuns(cy, runsOf());

      expect(classesOf(cy, APPS_NODE)).toStrictEqual(['run-running', 'package-run']);
    });
  });

  describe('GIVEN an expanded folder box apps holding web', () => {
    const BOX_DATA = { id: folderIdOf('apps') };
    const CHILD_DATA = { id: 'web', parent: folderIdOf('apps') };
    const BOX: ElementDefinition = { data: BOX_DATA };
    const CHILD: ElementDefinition = { data: CHILD_DATA };

    beforeEach(() => {
      cy.destroy();
      cy = cytoscape({ headless: true, styleEnabled: true, elements: [BOX, CHILD] });
    });

    it('WHEN web runs and the folder map is marked THEN the box never gets a run class', () => {
      markFolderRuns(cy, MEMBERS, runsOf(['web', 'running']));

      expect(classesOf(cy, folderIdOf('apps'))).toStrictEqual([]);
    });

    it('WHEN web runs and the packages are marked THEN web is marked', () => {
      markPackageRuns(cy, runsOf(['web', 'running']));

      expect(classesOf(cy, 'web')).toStrictEqual(['run-running', 'package-run']);
    });

    it('WHEN web runs and the packages are marked THEN the box is not', () => {
      markPackageRuns(cy, runsOf(['web', 'running']));

      expect(classesOf(cy, folderIdOf('apps'))).toStrictEqual([]);
    });
  });
});
