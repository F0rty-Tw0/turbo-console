import { endOf } from './module-end.util.ts';
import type { ModuleEnd, ModuleSitesResult } from '../../bridge/common/graph-module-sites.type.ts';
import type { ModuleSelection } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleSitesState } from '../common/module-details.type.ts';
import type { ModuleAsk } from '../common/module-selection.type.ts';

const FAILED: ModuleSitesState = { kind: 'failed' };

/** The end's kind and its path or name, so a file and a folder of one path differ. */
const endKeyOf = (end: ModuleEnd): string => (end.kind === 'stub' ? `stub:${end.name}` : `${end.kind}:${end.path}`);

const isSameEnd = (a: ModuleEnd, b: ModuleEnd): boolean => endKeyOf(a) === endKeyOf(b);

const isSameTo = (a: ModuleEnd | null, b: ModuleEnd | null): boolean => {
  if (a === null || b === null) return a === b;

  return isSameEnd(a, b);
};

/** The lookup behind `sel`: a node asks about its own end, a link about its source end toward its target end. */
export const askOf = (packageName: string, sel: ModuleSelection): ModuleAsk => {
  if (sel.kind === 'node') {
    const nodeAsk: ModuleAsk = { packageName, from: endOf(sel.id), to: null };

    return nodeAsk;
  }

  const linkAsk: ModuleAsk = { packageName, from: endOf(sel.source), to: endOf(sel.target) };

  return linkAsk;
};

/** Whether two lookups name the same package and the same ends, kind and path or name alike. */
export const isSameAsk = (a: ModuleAsk, b: ModuleAsk): boolean => {
  const isSamePackage = a.packageName === b.packageName;
  const isSameFrom = isSameEnd(a.from, b.from);
  const isSameToEnd = isSameTo(a.to, b.to);

  return isSamePackage && isSameFrom && isSameToEnd;
};

/** Whether the saved selection is already `sel`: the same card, or the same link in the same direction. */
export const isSameSelection = (a: ModuleSelection | null, b: ModuleSelection): boolean => {
  if (a === null) return false;

  if (a.kind === 'node') return b.kind === 'node' && a.id === b.id;

  return b.kind === 'link' && a.source === b.source && a.target === b.target;
};

/** The state a host answer leaves its lookup in. */
export const sitesStateOf = (result: ModuleSitesResult): ModuleSitesState => {
  if (result.kind === 'failed') return FAILED;

  const found: ModuleSitesState = { kind: 'found', result };

  return found;
};

/** A lookup asked: scanning over the last answer when `last`, the state of the same lookup shown before, found one (C19). */
export const scanningStateOf = (last: ModuleSitesState | null): ModuleSitesState => {
  const previous = last?.kind === 'found' ? last.result : null;
  const scanning: ModuleSitesState = { kind: 'scanning', previous };

  return scanning;
};
