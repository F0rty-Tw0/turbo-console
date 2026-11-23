import type { ImportsViewModel } from './details-imports.type.ts';
import type { ModuleSitesFound } from '../../bridge/common/graph-module-sites.type.ts';

type ModuleSitesScanning = { readonly kind: 'scanning'; readonly previous: ModuleSitesFound | null };

type ModuleSitesFailedState = { readonly kind: 'failed' };

type ModuleSitesFoundState = { readonly kind: 'found'; readonly result: ModuleSitesFound };

/** The sites lookup of one drawn end or link: a re-ask of the same `{from, to}` keeps the answer it shows as `previous`. */
export type ModuleSitesState = ModuleSitesScanning | ModuleSitesFailedState | ModuleSitesFoundState;

type ModuleDetailsEmpty = { readonly kind: 'empty' };

type ModuleDetailsLoading = { readonly kind: 'loading'; readonly packageName: string };

type ModuleDetailsFile = {
  readonly kind: 'file';
  readonly id: string;
  readonly path: string;
  readonly imports: ImportsViewModel;
  readonly importedBy: ImportsViewModel;
};

type ModuleDetailsStub = { readonly kind: 'stub'; readonly id: string; readonly name: string; readonly importedBy: ImportsViewModel };

type ModuleDetailsLink = { readonly kind: 'link'; readonly title: string; readonly imports: ImportsViewModel };

/** What the modules Details panel shows for the selection, before any element is drawn. */
export type ModuleDetailsView = ModuleDetailsEmpty | ModuleDetailsLoading | ModuleDetailsFile | ModuleDetailsStub | ModuleDetailsLink;
