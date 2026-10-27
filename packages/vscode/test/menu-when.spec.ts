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
  it.each([
    ['turboTask', [...RUN, ...FORCE, ...DIRECT, ...COPY, ...OPEN_JSON]],
    ['turboTask.cached', [...RUN, ...FORCE, ...FORCE_INLINE, ...DIRECT, ...COPY, ...OPEN_JSON]],
    ['turboTask.running', [...STOP, ...COPY, ...OPEN_JSON]],
    ['turboScript', [...RUN, ...COPY, ...OPEN_JSON]],
    ['turboScript.running', [...STOP, ...COPY, ...OPEN_JSON]],
    ['turboScript.x', [...RUN, ...COPY, ...OPEN_JSON]],
    ['turboTask.running.x', [...STOP, ...COPY, ...OPEN_JSON]],
    ['turboTask.atomFile', [...RUN, ...FORCE, ...COPY, ...OPEN_JSON, ...OPEN_SPEC]],
    ['turboTask.cached.atomFile', [...RUN, ...FORCE, ...FORCE_INLINE, ...COPY, ...OPEN_JSON, ...OPEN_SPEC]],
    ['turboTask.running.atomFile', [...STOP, ...COPY, ...OPEN_JSON, ...OPEN_SPEC]],
    ['turboTask.cached.x', [...RUN, ...FORCE, ...FORCE_INLINE, ...COPY, ...OPEN_JSON]],
    ['xturboTask', []],
    ['xturboScript', []],
    ['turboGroup', []],
    ['turboPackage', PACKAGE_ITEMS],
    ['turboDir', []],
    ['turboRoot', []],
    ['turboMessage', []]
  ])('GIVEN a %s row WHEN its menus are read THEN they hold exactly its commands and groups', (viewItem, expected) => {
    const items = shownIn(MENUS['view/item/context'], { view: TREE_VIEW, viewItem });

    expect(items).toStrictEqual(expected.toSorted());
  });

  it.each([
    [false, false, 'turboConsole.showScope navigation@0', 'turboConsole.showScripts navigation@1'],
    [true, false, 'turboConsole.hideScope navigation@0', 'turboConsole.showScripts navigation@1'],
    [false, true, 'turboConsole.showScope navigation@0', 'turboConsole.hideScripts navigation@1'],
    [true, true, 'turboConsole.hideScope navigation@0', 'turboConsole.hideScripts navigation@1']
  ])(
    'GIVEN scopes shown is %s and scripts shown is %s WHEN the view title is read THEN only the matching toggles are there',
    (scopeShown, scriptsShown, scopeToggle, scriptsToggle) => {
      const keys = {
        view: TREE_VIEW,
        'turboConsole.hasScripts': true,
        'turboConsole.scopeShown': scopeShown,
        'turboConsole.scriptsShown': scriptsShown,
        'config.turboConsole.treeMode': 'list'
      };

      const items = shownIn(MENUS['view/title'], keys);
      const expected = [
        scopeToggle,
        scriptsToggle,
        'turboConsole.refresh navigation@3',
        'turboConsole.showFolders navigation@2',
        'turboConsole.openPackageGraph navigation@4',
        'turboConsole.showAllTaskGraphs navigation@5'
      ];

      expect(items).toStrictEqual(expected.toSorted());
    }
  );

  it.each([
    [false, 'turboConsole.showScripts'],
    [true, 'turboConsole.hideScripts']
  ])('GIVEN scripts shown is %s WHEN the command palette is read THEN only %s is there of the pair', (scriptsShown, command) => {
    const keys = { 'turboConsole.active': true, 'turboConsole.hasScripts': true, 'turboConsole.scriptsShown': scriptsShown };
    const shown = paletteScriptsOf(keys);

    expect(shown).toStrictEqual([command]);
  });

  it.each([[false], [true]])(
    'GIVEN the workspace has no scripts and scripts shown is %s WHEN the view title and the palette are read THEN neither Scripts command is there',
    (scriptsShown) => {
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
    }
  );

  it.each([
    [true, ['turboConsole.openPackageGraph']],
    [false, []]
  ])('GIVEN the extension active is %s WHEN the command palette is read THEN Show Package Graph shows as %j', (active, expected) => {
    const keys = { 'turboConsole.active': active };
    const shown = MENUS.commandPalette.filter((entry) => entry.command.endsWith('PackageGraph') && whenMatches(entry.when, keys));

    expect(shown.map((entry) => entry.command)).toStrictEqual(expected);
  });

  it.each([
    [true, ['turboConsole.showAllTaskGraphs navigation@5']],
    [false, ['turboConsole.openPackageGraph navigation@4', 'turboConsole.showAllTaskGraphs navigation@5']]
  ])('GIVEN singlePackage is %s WHEN the view title is read THEN the graph icons are %j', (singlePackage, expected) => {
    const keys = { view: TREE_VIEW, [SINGLE_PACKAGE_KEY]: singlePackage };
    const graphs = shownIn(MENUS['view/title'], keys).filter((placement) => placement.includes('Graph'));

    expect(graphs).toStrictEqual(expected.toSorted());
  });

  it('GIVEN the window is single-package and the extension active WHEN the command palette is read THEN Show Package Graph stays there', () => {
    const keys = { 'turboConsole.active': true, [SINGLE_PACKAGE_KEY]: true };
    const shown = MENUS.commandPalette.filter((entry) => entry.command.endsWith('PackageGraph') && whenMatches(entry.when, keys));

    expect(shown.map((entry) => entry.command)).toStrictEqual(['turboConsole.openPackageGraph']);
  });

  it.each([
    [true, ['turboConsole.showTaskGraph']],
    [false, []]
  ])('GIVEN the extension active is %s WHEN the command palette is read THEN Show Task Graph shows as %j', (active, expected) => {
    const keys = { 'turboConsole.active': active };
    const shown = MENUS.commandPalette.filter((entry) => entry.command.endsWith('TaskGraph') && whenMatches(entry.when, keys));

    expect(shown.map((entry) => entry.command)).toStrictEqual(expected);
  });

  it.each([
    [true, ['turboConsole.showAllTaskGraphs']],
    [false, []]
  ])('GIVEN the extension active is %s WHEN the command palette is read THEN Show All Task Graphs shows as %j', (active, expected) => {
    const keys = { 'turboConsole.active': active };
    const shown = MENUS.commandPalette.filter((entry) => entry.command.endsWith('AllTaskGraphs') && whenMatches(entry.when, keys));

    expect(shown.map((entry) => entry.command)).toStrictEqual(expected);
  });

  it.each([
    'turboConsole.runTask',
    'turboConsole.runTaskWithoutCache',
    'turboConsole.runTaskWithoutTurbo',
    'turboConsole.stopTask',
    'turboConsole.copyCommand',
    'turboConsole.openSpec',
    'turboConsole.focusPackageInGraph'
  ])('GIVEN the row command %s WHEN the command palette is read THEN it is hidden there', (command) => {
    const entries = MENUS.commandPalette.filter((entry) => entry.command === command);

    expect(entries).toStrictEqual([{ command, when: 'false' }]);
  });
});
