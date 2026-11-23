import type { ModuleCanvas } from './module-canvas.type.ts';
import type { ModuleDetailsList, ModuleDetailsView } from './module-details.type.ts';
import type { ModuleInputMode } from './module-mode.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { ModuleEnd } from '../../bridge/common/graph-module-sites.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';

/** One sites lookup: the package and the end it asks about, or the two ends of a link (`to` set). */
export type ModuleAsk = { readonly packageName: string; readonly from: ModuleEnd; readonly to: ModuleEnd | null };

/** Which Details blocks show every row past `IMPORTS_FOLD_AT`; a re-ask of the same lookup keeps them (C19). */
export type ModuleFolds = { readonly imports: boolean; readonly importedBy: boolean };

type ModuleModeSave = { readonly save: (view: ModulesViewState) => void };

/** Modules mode as the selection reads and writes it (`GraphModuleMode`): the phase, the saved view, a draw and a save. */
export type ModuleSelectionMode = Pick<ModuleInputMode, 'phase' | 'view' | 'update'> & ModuleModeSave;

/** Where the selection shows its Details view (`GraphModuleDetails`). */
export type ModuleDetailsSink = { readonly show: (view: ModuleDetailsView) => void };

/** What `GraphModuleSelection` saves through, paints on, asks the host with and shows its Details view in. */
export type ModuleSelectionDeps = {
  readonly mode: ModuleSelectionMode;
  readonly canvas: Pick<ModuleCanvas, 'paint' | 'selected'>;
  readonly bridge: Pick<Bridge, 'post'>;
  readonly details: ModuleDetailsSink;
};

/** The selection as the module panels report to it (`GraphModuleSelection`). */
export type ModulePanelSelection = {
  readonly clear: () => void;
  readonly scanAgain: () => void;
  readonly focus: (target: string) => void;
  readonly fold: (list: ModuleDetailsList) => void;
  readonly clearFocus: () => void;
  readonly setDepth: (depth: number) => void;
};
