import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { array, object, omit, optional, string } from 'zod/mini';
import type { output } from 'zod/mini';

import { whenMatches } from './utils/when-clause.spec.util.ts';
import { SINGLE_PACKAGE_KEY } from '../src/tree/common/single-package-key.const.ts';

const optionalGroupSchema = optional(string());

const menuEntrySchema = object({ command: string(), when: string(), group: optionalGroupSchema });

const menusSchema = object({
  'view/title': array(menuEntrySchema),
  'view/item/context': array(menuEntrySchema),
  commandPalette: array(omit(menuEntrySchema, { group: true }))
});

const manifestSchema = object({ contributes: object({ menus: menusSchema }) });

type MenuEntry = output<typeof menuEntrySchema>;

type PaletteEntry = Omit<MenuEntry, 'group'>;

type ContextKeys = Readonly<Record<string, string | boolean>>;

const MANIFEST_TEXT = readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8');

const { menus: MENUS } = manifestSchema.parse(JSON.parse(MANIFEST_TEXT)).contributes;

const TREE_VIEW = 'turboConsole.tree';

const RUN = ['turboConsole.runTask inline@0', 'turboConsole.runTask 1_run@0'];
const STOP = ['turboConsole.stopTask inline@0', 'turboConsole.stopTask 1_run@0'];
const FORCE = ['turboConsole.runTaskWithoutCache 1_run@1'];
const FORCE_INLINE = ['turboConsole.runTaskWithoutCache inline@3'];
const DIRECT = ['turboConsole.runTaskWithoutTurbo 1_run@2'];
const OPTIONS = ['turboConsole.runTaskWithOptions 1_run@3'];
const COPY = ['turboConsole.copyCommand inline@1', 'turboConsole.copyCommand 3_copy'];
const OPEN_JSON = ['turboConsole.openPackageJson inline@2', 'turboConsole.openPackageJson 2_open@1'];
const OPEN_SPEC = ['turboConsole.openSpec inline@4'];

const PACKAGE_ITEMS = [
  'turboConsole.openPackageDetails inline@0',
  'turboConsole.openPackageDetails 2_open@0',
  'turboConsole.openPackageJson inline@1',
  'turboConsole.openPackageJson 2_open@1',
  'turboConsole.revealInExplorer 2_open@2',
  'turboConsole.copyPath 3_copy'
];

/** A regex, not `endsWith`: `turboConsole.runAffected` also ends in `Affected`. */
const AFFECTED_TOGGLE = /(show|hide)Affected/u;

const placementOf = (entry: MenuEntry): string => `${entry.command} ${entry.group ?? ''}`;

const shownIn = (entries: MenuEntry[], keys: ContextKeys): string[] => {
  const shown = entries.filter((entry) => whenMatches(entry.when, keys));
  const placements = shown.map(placementOf);

  return placements.toSorted();
};

/** The Show/Hide Scripts commands the command palette offers under `keys`. */
const paletteScriptsOf = (keys: ContextKeys): string[] => {
  const isShownScriptsCommand = (entry: PaletteEntry): boolean => entry.command.endsWith('Scripts') && whenMatches(entry.when, keys);
  const shown = MENUS.commandPalette.filter(isShownScriptsCommand);

  return shown.map((entry) => entry.command);
};

describe('FEATURE: tree menus by context value (spec 1c-a §4.12)', () => {
  describe.each([
    ['turboTask', [...RUN, ...FORCE, ...DIRECT, ...OPTIONS, ...COPY, ...OPEN_JSON]],
    ['turboTask.cached', [...RUN, ...FORCE, ...FORCE_INLINE, ...DIRECT, ...OPTIONS, ...COPY, ...OPEN_JSON]],
    ['turboTask.running', [...STOP, ...COPY, ...OPEN_JSON]],
    ['turboScript', [...RUN, ...OPTIONS, ...COPY, ...OPEN_JSON]],
    ['turboScript.running', [...STOP, ...COPY, ...OPEN_JSON]],
    ['turboScript.x', [...RUN, ...OPTIONS, ...COPY, ...OPEN_JSON]],
    ['turboTask.running.x', [...STOP, ...COPY, ...OPEN_JSON]],
    ['turboTask.atomFile', [...RUN, ...FORCE, ...OPTIONS, ...COPY, ...OPEN_JSON, ...OPEN_SPEC]],
    ['turboTask.cached.atomFile', [...RUN, ...FORCE, ...FORCE_INLINE, ...OPTIONS, ...COPY, ...OPEN_JSON, ...OPEN_SPEC]],
    ['turboTask.running.atomFile', [...STOP, ...COPY, ...OPEN_JSON, ...OPEN_SPEC]],
    ['turboTask.cached.x', [...RUN, ...FORCE, ...FORCE_INLINE, ...OPTIONS, ...COPY, ...OPEN_JSON]],
    ['xturboTask', []],
    ['xturboScript', []],
    ['turboGroup', []],
    ['turboPackage', PACKAGE_ITEMS],
    ['turboDir', []],
    ['turboRoot', []],
    ['turboMessage', []]
  ])('GIVEN a %s row', (viewItem, expected) => {
    it('WHEN its menus are read THEN they hold exactly its commands and groups', () => {
      const items = shownIn(MENUS['view/item/context'], { view: TREE_VIEW, viewItem });

      expect(items).toStrictEqual(expected.toSorted());
    });
  });

  describe.each([
    [false, false, 'turboConsole.showScope navigation@0', 'turboConsole.showScripts navigation@1'],
    [true, false, 'turboConsole.hideScope navigation@0', 'turboConsole.showScripts navigation@1'],
    [false, true, 'turboConsole.showScope navigation@0', 'turboConsole.hideScripts navigation@1'],
    [true, true, 'turboConsole.hideScope navigation@0', 'turboConsole.hideScripts navigation@1']
  ])('GIVEN scopes shown is %s and scripts shown is %s', (scopeShown, scriptsShown, scopeToggle, scriptsToggle) => {
    it('WHEN the view title is read THEN only the matching toggles are there', () => {
      const keys = {
        view: TREE_VIEW,
        'turboConsole.hasScripts': true,
        'turboConsole.scopeShown': scopeShown,
        'turboConsole.scriptsShown': scriptsShown,
        'turboConsole.predictionShown': false,
        'turboConsole.affectedShown': false,
        'config.turboConsole.treeMode': 'list'
      };

      const items = shownIn(MENUS['view/title'], keys);
      const expected = [
        scopeToggle,
        scriptsToggle,
        'turboConsole.showPrediction navigation@6',
        'turboConsole.showAffected navigation@7',
        'turboConsole.refresh navigation@3',
        'turboConsole.showFolders navigation@2',
        'turboConsole.openPackageGraph navigation@4',
        'turboConsole.showAllTaskGraphs navigation@5'
      ];

      expect(items).toStrictEqual(expected.toSorted());
    });
  });

  describe.each([
    [false, 'turboConsole.showScripts'],
    [true, 'turboConsole.hideScripts']
  ])('GIVEN scripts shown is %s', (scriptsShown, command) => {
    it(`WHEN the command palette is read THEN only ${command} is there of the pair`, () => {
      const keys = { 'turboConsole.active': true, 'turboConsole.hasScripts': true, 'turboConsole.scriptsShown': scriptsShown };
      const shown = paletteScriptsOf(keys);

      expect(shown).toStrictEqual([command]);
    });
  });

  describe.each([
    [false, 'turboConsole.showPrediction navigation@6'],
    [true, 'turboConsole.hidePrediction navigation@6']
  ])('GIVEN prediction shown is %s', (predictionShown, placement) => {
    it(`WHEN the view title is read THEN only ${placement} is there of the pair`, () => {
      const keys = { view: TREE_VIEW, 'turboConsole.predictionShown': predictionShown };
      const title = shownIn(MENUS['view/title'], keys).filter((entry) => entry.includes('Prediction'));

      expect(title).toStrictEqual([placement]);
    });
  });

  describe.each([
    [false, 'turboConsole.showPrediction'],
    [true, 'turboConsole.hidePrediction']
  ])('GIVEN prediction shown is %s', (predictionShown, command) => {
    it(`WHEN the command palette is read THEN only ${command} is there of the pair`, () => {
      const keys = { 'turboConsole.active': true, 'turboConsole.predictionShown': predictionShown };
      const shown = MENUS.commandPalette.filter((entry) => entry.command.endsWith('Prediction') && whenMatches(entry.when, keys));

      expect(shown.map((entry) => entry.command)).toStrictEqual([command]);
    });
  });

  describe.each([
    [false, 'turboConsole.showAffected navigation@7'],
    [true, 'turboConsole.hideAffected navigation@7']
  ])('GIVEN affected shown is %s', (affectedShown, placement) => {
    it(`WHEN the view title is read THEN only ${placement} is there of the pair`, () => {
      const keys = { view: TREE_VIEW, 'turboConsole.affectedShown': affectedShown };
      const title = shownIn(MENUS['view/title'], keys).filter((entry) => AFFECTED_TOGGLE.test(entry));

      expect(title).toStrictEqual([placement]);
    });
  });

  describe.each([
    [false, 'turboConsole.showAffected'],
    [true, 'turboConsole.hideAffected']
  ])('GIVEN affected shown is %s', (affectedShown, command) => {
    it(`WHEN the command palette is read THEN only ${command} is there of the pair`, () => {
      const keys = { 'turboConsole.active': true, 'turboConsole.affectedShown': affectedShown };
      const shown = MENUS.commandPalette.filter((entry) => AFFECTED_TOGGLE.test(entry.command) && whenMatches(entry.when, keys));

      expect(shown.map((entry) => entry.command)).toStrictEqual([command]);
    });
  });

  describe.each([[false], [true]])('GIVEN the workspace has no scripts and scripts shown is %s', (scriptsShown) => {
    it('WHEN the view title and the palette are read THEN neither Scripts command is there', () => {
      const keys = {
        view: TREE_VIEW,
        'turboConsole.active': true,
        'turboConsole.hasScripts': false,
        'turboConsole.scriptsShown': scriptsShown,
        'config.turboConsole.treeMode': 'list'
      };
      const title = shownIn(MENUS['view/title'], keys).filter((placement) => placement.includes('Scripts'));
      const palette = paletteScriptsOf(keys);

      expect(title).toStrictEqual([]);
      expect(palette).toStrictEqual([]);
    });
  });

  describe.each([
    [true, ['turboConsole.openPackageGraph']],
    [false, []]
  ])('GIVEN the extension active is %s', (active, expected) => {
    it(`WHEN the command palette is read THEN Show Package Graph shows as ${JSON.stringify(expected)}`, () => {
      const keys = { 'turboConsole.active': active };
      const shown = MENUS.commandPalette.filter((entry) => entry.command.endsWith('PackageGraph') && whenMatches(entry.when, keys));

      expect(shown.map((entry) => entry.command)).toStrictEqual(expected);
    });
  });

  describe.each([
    [true, ['turboConsole.showAllTaskGraphs navigation@5']],
    [false, ['turboConsole.openPackageGraph navigation@4', 'turboConsole.showAllTaskGraphs navigation@5']]
  ])('GIVEN singlePackage is %s', (singlePackage, expected) => {
    it(`WHEN the view title is read THEN the graph icons are ${JSON.stringify(expected)}`, () => {
      const keys = { view: TREE_VIEW, [SINGLE_PACKAGE_KEY]: singlePackage };
      const graphs = shownIn(MENUS['view/title'], keys).filter((placement) => placement.includes('Graph'));

      expect(graphs).toStrictEqual(expected.toSorted());
    });
  });

  describe('GIVEN the window is single-package and the extension active', () => {
    it('WHEN the command palette is read THEN Show Package Graph stays there', () => {
      const keys = { 'turboConsole.active': true, [SINGLE_PACKAGE_KEY]: true };
      const shown = MENUS.commandPalette.filter((entry) => entry.command.endsWith('PackageGraph') && whenMatches(entry.when, keys));

      expect(shown.map((entry) => entry.command)).toStrictEqual(['turboConsole.openPackageGraph']);
    });
  });

  describe.each([
    [true, ['turboConsole.showTaskGraph']],
    [false, []]
  ])('GIVEN the extension active is %s', (active, expected) => {
    it(`WHEN the command palette is read THEN Show Task Graph shows as ${JSON.stringify(expected)}`, () => {
      const keys = { 'turboConsole.active': active };
      const shown = MENUS.commandPalette.filter((entry) => entry.command.endsWith('TaskGraph') && whenMatches(entry.when, keys));

      expect(shown.map((entry) => entry.command)).toStrictEqual(expected);
    });
  });

  describe.each([
    [true, ['turboConsole.showAllTaskGraphs']],
    [false, []]
  ])('GIVEN the extension active is %s', (active, expected) => {
    it(`WHEN the command palette is read THEN Show All Task Graphs shows as ${JSON.stringify(expected)}`, () => {
      const keys = { 'turboConsole.active': active };
      const shown = MENUS.commandPalette.filter((entry) => entry.command.endsWith('AllTaskGraphs') && whenMatches(entry.when, keys));

      expect(shown.map((entry) => entry.command)).toStrictEqual(expected);
    });
  });

  describe.each([
    'turboConsole.runTask',
    'turboConsole.runTaskWithoutCache',
    'turboConsole.runTaskWithoutTurbo',
    'turboConsole.runTaskWithOptions',
    'turboConsole.stopTask',
    'turboConsole.copyCommand',
    'turboConsole.openSpec',
    'turboConsole.focusPackageInGraph'
  ])('GIVEN the row command %s', (command) => {
    it('WHEN the command palette is read THEN it is hidden there', () => {
      const entries = MENUS.commandPalette.filter((entry) => entry.command === command);

      expect(entries).toStrictEqual([{ command, when: 'false' }]);
    });
  });
});
