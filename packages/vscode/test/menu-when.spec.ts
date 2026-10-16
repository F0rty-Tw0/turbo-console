import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { whenMatches } from './utils/when-clause.spec.util.ts';

const optionalGroupSchema = z.string().optional();

const menuEntrySchema = z.object({ command: z.string(), when: z.string(), group: optionalGroupSchema });

const menusSchema = z.object({
  'view/title': z.array(menuEntrySchema),
  'view/item/context': z.array(menuEntrySchema),
  commandPalette: z.array(menuEntrySchema.omit({ group: true }))
});

const manifestSchema = z.object({ contributes: z.object({ menus: menusSchema }) });

type MenuEntry = z.infer<typeof menuEntrySchema>;

const MANIFEST_TEXT = readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8');

const { menus: MENUS } = manifestSchema.parse(JSON.parse(MANIFEST_TEXT)).contributes;

const TREE_VIEW = 'turboConsole.tree';

const RUN = ['turboConsole.runTask inline@0', 'turboConsole.runTask 1_run@0'];
const STOP = ['turboConsole.stopTask inline@0', 'turboConsole.stopTask 1_run@0'];
const FORCE = ['turboConsole.runTaskWithoutCache 1_run@1'];
const FORCE_INLINE = ['turboConsole.runTaskWithoutCache inline@3'];
const COPY = ['turboConsole.copyCommand inline@1', 'turboConsole.copyCommand 3_copy'];
const OPEN_JSON = ['turboConsole.openPackageJson inline@2', 'turboConsole.openPackageJson 2_open@1'];

const PACKAGE_ITEMS = [
  'turboConsole.openPackageDetails inline@0',
  'turboConsole.openPackageDetails 2_open@0',
  'turboConsole.openPackageJson inline@1',
  'turboConsole.openPackageJson 2_open@1',
  'turboConsole.revealInExplorer 2_open@2',
  'turboConsole.copyPath 3_copy'
];

const placementOf = (entry: MenuEntry): string => `${entry.command} ${entry.group ?? ''}`;

const shownIn = (entries: MenuEntry[], keys: Readonly<Record<string, string | boolean>>): string[] => {
  const shown = entries.filter((entry) => whenMatches(entry.when, keys));
  const placements = shown.map(placementOf);

  return placements.toSorted();
};

describe('FEATURE: tree menus by context value (spec 1c-a §4.12)', () => {
  it.each([
    ['turboTask', [...RUN, ...FORCE, ...COPY, ...OPEN_JSON]],
    ['turboTask.cached', [...RUN, ...FORCE, ...FORCE_INLINE, ...COPY, ...OPEN_JSON]],
    ['turboTask.running', [...STOP, ...COPY, ...OPEN_JSON]],
    ['turboScript', [...RUN, ...COPY, ...OPEN_JSON]],
    ['turboScript.running', [...STOP, ...COPY, ...OPEN_JSON]],
    ['turboScript.x', [...RUN, ...COPY, ...OPEN_JSON]],
    ['turboTask.running.x', [...STOP, ...COPY, ...OPEN_JSON]],
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
        'turboConsole.scopeShown': scopeShown,
        'turboConsole.scriptsShown': scriptsShown,
        'config.turboConsole.treeMode': 'list'
      };

      const items = shownIn(MENUS['view/title'], keys);
      const expected = [scopeToggle, scriptsToggle, 'turboConsole.refresh navigation@3', 'turboConsole.showFolders navigation@2'];

      expect(items).toStrictEqual(expected.toSorted());
    }
  );

  it.each([
    [false, 'turboConsole.showScripts'],
    [true, 'turboConsole.hideScripts']
  ])('GIVEN scripts shown is %s WHEN the command palette is read THEN only %s is there of the pair', (scriptsShown, command) => {
    const keys = { 'turboConsole.active': true, 'turboConsole.scriptsShown': scriptsShown };
    const shown = MENUS.commandPalette.filter((entry) => entry.command.endsWith('Scripts') && whenMatches(entry.when, keys));

    expect(shown.map((entry) => entry.command)).toStrictEqual([command]);
  });

  it.each(['turboConsole.runTask', 'turboConsole.runTaskWithoutCache', 'turboConsole.stopTask', 'turboConsole.copyCommand'])(
    'GIVEN the row command %s WHEN the command palette is read THEN it is hidden there',
    (command) => {
      const entries = MENUS.commandPalette.filter((entry) => entry.command === command);

      expect(entries).toStrictEqual([{ command, when: 'false' }]);
    }
  );
});
