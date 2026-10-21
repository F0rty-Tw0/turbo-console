import { renderPicking } from './graph-details-picking.ts';
import type { ManifestEntry } from '../../bridge/common/graph-message.type.ts';
import type { ExplainDetails, ExplainEntry, NeighbourItem, PackageDetails, TraceDetails } from '../common/details-view.type.ts';
import { CLEAR_FOCUS_LABEL, FOCUS_LABEL } from '../common/details.const.ts';
import type { DetailsViews, ExplainState, FoundExplain } from '../common/details.type.ts';
import type { DetailsContext, DetailsView } from '../common/graph-details.type.ts';
import type { Inspection, TraceInspection } from '../common/inspection.type.ts';
import { packageModelOf, traceModelOf } from '../utils/details-model.util.ts';
import {
  entryLabelOf,
  missingTextOf,
  openAtLabelOf,
  openDetailsLabelOf,
  openManifestLabelOf,
  readingTextOf,
  traceSummaryOf,
  unreadableTextOf
} from '../utils/details-text.util.ts';
import { excerptRowsOf } from '../utils/excerpt.util.ts';
import { refocusOf } from '../utils/refocus.util.ts';

/** `aria-disabled`, never `disabled`, so a control the filters lock keeps its focus. */
const setDisabled = (button: HTMLButtonElement, isDisabled: boolean): void => {
  if (isDisabled) button.setAttribute('aria-disabled', 'true');
  else button.removeAttribute('aria-disabled');
};

const updateNeighbour = (item: NeighbourItem, visible: ReadonlySet<string>): void => {
  const isVisible = visible.has(item.name);

  item.mark.hidden = isVisible;
  setDisabled(item.pick, !isVisible);
  setDisabled(item.explain, !isVisible);
};

const updatePackage = (view: PackageDetails, name: string, context: DetailsContext): boolean => {
  const model = packageModelOf(name, context);

  if (model === null) return false;

  view.openLabel.textContent = openDetailsLabelOf(model.taskCount);
  view.focus.textContent = model.isFocused ? CLEAR_FOCUS_LABEL : FOCUS_LABEL;
  setDisabled(view.exclude, model.isFocused);

  for (const item of [...view.dependencies, ...view.dependents]) updateNeighbour(item, context.visible);

  return true;
};

const updateTrace = (view: TraceDetails, inspection: TraceInspection, context: DetailsContext, views: DetailsViews): boolean => {
  const { trace, visible, showable } = context;

  if (trace === null) return false;

  const model = traceModelOf(inspection, trace, visible, showable);
  const items = views.stepItems(model.steps);

  view.lead.textContent = traceSummaryOf(model.start, model.end, model.direction, model.steps.length);
  view.steps.replaceChildren(...items);

  return true;
};

/** Updates the shown view in place for the same inspection; `false` when it cannot, and the view must be built again. */
export const updateView = (view: DetailsView, inspection: Inspection, context: DetailsContext, views: DetailsViews): boolean => {
  switch (inspection.kind) {
    case 'none':
      return view.kind === 'empty';
    case 'link':
      return view.kind === 'link';
    case 'package':
      return view.kind === 'package' && updatePackage(view, inspection.name, context);
    case 'picking':
      return view.kind === 'picking' && renderPicking(view, inspection.start, context, views);
    case 'trace':
      return view.kind === 'trace' && updateTrace(view, inspection, context, views);
  }
};

/** The `data-name` of the element in `aside` that has focus, read before a list is rebuilt under it. */
export const focusedNameOf = (aside: HTMLElement): string | null => {
  const active = document.activeElement;

  if (!(active instanceof HTMLElement)) return null;

  const isInside = aside.contains(active);

  if (!isInside) return null;

  return active.dataset['name'] ?? null;
};

/** The removed-focus rule: after a list was rebuilt, the item of the same name, else the heading, takes focus back. */
export const refocusList = (view: DetailsView, focused: string | null): void => {
  if (view.kind !== 'picking' && view.kind !== 'trace') return;

  const buttons = Array.from(view.root.querySelectorAll<HTMLButtonElement>('button[data-name]'));
  const names = buttons.map((button) => button.dataset['name'] ?? '');
  const refocus = refocusOf(focused, names);
  const item = buttons.find((button) => button.dataset['name'] === focused);

  if (refocus === 'item') item?.focus();

  if (refocus === 'heading') view.heading.focus();
};

const setText = (element: Element | null | undefined, text: string): void => {
  if (element !== null && element !== undefined) element.textContent = text;
};

const updateEntry = (parts: ExplainEntry, entry: ManifestEntry): void => {
  const rows = excerptRowsOf(entry);

  setText(parts.label, entryLabelOf(entry));
  parts.rows.forEach((elements, index) => {
    const row = rows[index];

    if (row === undefined) return;

    setText(elements.number, String(row.number));
    setText(elements.text, row.text);
    elements.number.parentElement?.classList.toggle('is-entry', row.isEntry);
  });
  setText(parts.open, openAtLabelOf(entry.line));
  parts.open.setAttribute('aria-label', openManifestLabelOf(entry));
};

const updateFound = (details: ExplainDetails, state: FoundExplain): void => {
  setText(details.heading?.lastElementChild, state.file);
  details.entries.forEach((parts, index) => {
    const entry = state.entries[index];

    if (entry !== undefined) updateEntry(parts, entry);
  });
};

/** Rewrites the explain block in place; its buttons stay, so a focused one keeps focus. */
export const updateExplain = (details: ExplainDetails, state: ExplainState): void => {
  switch (state.kind) {
    case 'reading':
      setText(details.text, readingTextOf(state.file));
      break;
    case 'missing':
      setText(details.text, missingTextOf(state.file, state.target));
      break;
    case 'unreadable':
      setText(details.text, unreadableTextOf(state.file));
      break;
    case 'found':
      updateFound(details, state);
      break;
  }
};
