import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type { ImportsDetails } from '../../common/details-view.type.ts';
import type { TaskModes } from '../../common/graph-task.type.ts';
import type {
  ModuleDetailsActions,
  ModuleDetailsDeps,
  ModuleDetailsElements,
  ModuleDetailsList
} from '../../common/module-details.type.ts';
import type { ModuleDetailsRig } from '../common/graph-module-details.type.ts';
import { moduleDetailsViewsMock } from '../mocks/module-panel-views.mock.ts';

export const latestOf = (built: ModuleDetailsElements[]): ModuleDetailsElements => {
  const latest = built.at(-1);

  if (latest === undefined) throw new Error('no module Details view was built');

  return latest;
};

export const blockOf = (elements: ModuleDetailsElements, list: ModuleDetailsList): ImportsDetails => {
  const block = elements.blocks.find((each) => each.list === list);

  if (block === undefined) throw new Error(`no ${list} block`);

  return block.details;
};

/** The first row button of the view's Imports block: `src/b.ts` line 4. */
export const firstRowOf = (elements: ModuleDetailsElements): HTMLButtonElement => {
  const [row] = blockOf(elements, 'imports').rows;

  if (row === undefined) throw new Error('no import row');

  return row.button;
};

export const focusOf = (elements: ModuleDetailsElements): HTMLButtonElement => {
  const { focus } = elements;

  if (focus === null) throw new Error('no Focus button');

  return focus;
};

/**
 * The module Details deps over the real builders, on `packageName`; the package aside, holding the Details bar, is
 * handed back only when `hasPackageAside`.
 */
export const moduleDetailsRigOf = (packageName: string | null, hasPackageAside = true): ModuleDetailsRig => {
  const button = (): HTMLButtonElement => document.createElement('button');
  const packageAside = document.createElement('aside');
  const detailsBar = document.createElement('div');
  const page = {
    body: document.createElement('div'),
    details: button(),
    clear: button(),
    detailsBar,
    detailsSummary: document.createElement('span'),
    packagesMode: button(),
    modeGroup: document.createElement('div'),
    controls: button()
  };
  const { views, panel, built } = moduleDetailsViewsMock();
  const post = vi.fn<Bridge['post']>();
  const savePanels = vi.fn<TaskModes['savePanels']>();
  const actions: Mocked<ModuleDetailsActions> = { onClear: vi.fn(), onScanAgain: vi.fn(), onFocus: vi.fn(), onFold: vi.fn() };
  const bridge = { post };
  const modes = { savePanels };
  const deps: ModuleDetailsDeps = {
    page,
    views,
    bridge,
    modes,
    packageName: (): string | null => packageName,
    packageAside: (): HTMLElement | null => (hasPackageAside ? packageAside : null),
    actions
  };
  const rig: ModuleDetailsRig = { deps, post, savePanels, actions, panel: panel.panel, packageAside, built };

  packageAside.id = 'graph-details';
  packageAside.prepend(detailsBar);
  page.body.append(packageAside);

  return rig;
};
