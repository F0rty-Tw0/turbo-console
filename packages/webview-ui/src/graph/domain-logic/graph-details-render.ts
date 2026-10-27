import { setButtonLabel, setButtonText } from './button-title.ts';
import { renderPicking } from './graph-details-picking.ts';
import type { ManifestEntry } from '../../bridge/common/graph-message.type.ts';
import type { ExplainDetails, ExplainEntry, NeighbourItem, PackageDetails } from '../common/details-view.type.ts';
import { CLEAR_FOCUS_LABEL, FOCUS_FOLDER_LABEL, FOCUS_LABEL } from '../common/details.const.ts';
import type { DetailsViews, ExplainState, FoundExplain } from '../common/details.type.ts';
import type { DetailsContext, DetailsView, GraphDetailsDeps, ShownInspection, ShownTrace } from '../common/graph-details.type.ts';
import { folderToggleTextOf } from '../utils/controls-text.util.ts';
import { folderModelOf, packageModelOf, traceModelOf } from '../utils/details-model.util.ts';
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

const updatePackage = (view: PackageDetails, name: string, context: DetailsContext, hasTasks: (name: string) => boolean): boolean => {
  const model = packageModelOf(name, context);

  if (model === null) return false;

  const openText = openDetailsLabelOf(model.taskCount);

  view.openLabel.textContent = openText;
  view.openDetails.title = openText;
  setButtonText(view.focus, model.isFocused ? CLEAR_FOCUS_LABEL : FOCUS_LABEL);
  setDisabled(view.exclude, model.isFocused);
  view.showTasks.hidden = !hasTasks(name);

  for (const item of [...view.dependencies, ...view.dependents]) updateNeighbour(item, context.visible);

  return true;
};

/** The member list of one folder never changes within a hash, so only its states are rewritten; `false` for an unknown folder. */
const updateFolder = (view: DetailsView, folder: string, context: DetailsContext): boolean => {
  const model = folderModelOf(folder, context, false);

  if (view.kind !== 'folder' || model === null) return false;

  view.summary.textContent = model.summary;
  setButtonText(view.toggle, folderToggleTextOf(model.isCollapsed));
  setButtonText(view.focus, model.isFocused ? CLEAR_FOCUS_LABEL : FOCUS_FOLDER_LABEL);

  const visibleByName = new Map(model.members.map((member) => [member.name, member.isVisible]));

  for (const item of view.members) {
    const isVisible = visibleByName.get(item.name) ?? false;

    item.mark.hidden = isVisible;
    setDisabled(item.pick, !isVisible);
  }

  return true;
};

const updateTrace = (view: DetailsView, traced: ShownTrace, context: DetailsContext, views: DetailsViews): boolean => {
  if (view.kind !== 'trace') return false;

  const { visible, showable } = context;
  const model = traceModelOf(traced, traced.trace, visible, showable);
  const items = views.stepItems(model.steps);

  view.lead.textContent = traceSummaryOf(model.start, model.end, model.direction, model.steps.length);
  view.steps.replaceChildren(...items);

  return true;
};

/**
 * Updates the shown view in place for the same inspection, a package's Show tasks offered again as its tasks now say;
 * `false` when it cannot, and the view must be built again.
 */
export const updateView = (
  view: DetailsView,
  inspection: ShownInspection,
  context: DetailsContext,
  deps: Pick<GraphDetailsDeps, 'views' | 'hasTasks'>
): boolean => {
  const { views, hasTasks } = deps;

  switch (inspection.kind) {
    case 'none':
      return view.kind === 'empty';
    case 'link':
      return view.kind === 'link';
    case 'package':
      return view.kind === 'package' && updatePackage(view, inspection.name, context, hasTasks);
    case 'folder':
      return updateFolder(view, inspection.folder, context);
    case 'picking':
      if (view.kind === 'picking') renderPicking(view, inspection, context.drawn.infos, views);

      return view.kind === 'picking';
    case 'trace':
      return updateTrace(view, inspection, context, views);
  }
};

/** The `data-name` of the element in `content` that has focus, read before a list is rebuilt under it. */
export const focusedNameOf = (content: HTMLElement): string | null => {
  const active = document.activeElement;

  if (!(active instanceof HTMLElement)) return null;

  const isInside = content.contains(active);

  if (!isInside) return null;

  return active.dataset['name'] ?? null;
};

/**
 * Whether a view built for `inspection` takes focus: focus is in `content`, or on Clear selection while nothing is shown,
 * since the Details bar hides with it. Other focus in the bar stays.
 */
export const hadFocusOf = (content: HTMLElement, clear: HTMLElement, inspection: ShownInspection): boolean => {
  const active = document.activeElement;
  const isClearHiding = inspection.kind === 'none' && active === clear;

  return content.contains(active) || isClearHiding;
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

const setText = (element: HTMLElement | null, text: string): void => {
  if (element !== null) element.textContent = text;
};

const updateEntry = (parts: ExplainEntry, entry: ManifestEntry): void => {
  const rows = excerptRowsOf(entry);

  setText(parts.label, entryLabelOf(entry));
  parts.rows.forEach((elements, index) => {
    const row = rows[index];

    if (row === undefined) return;

    setText(elements.number, String(row.number));
    setText(elements.text, row.text);
    elements.row.classList.toggle('is-entry', row.isEntry);
  });
  setText(parts.open, openAtLabelOf(entry.line));
  setButtonLabel(parts.open, openManifestLabelOf(entry));
};

const updateFound = (details: ExplainDetails, state: FoundExplain): void => {
  setText(details.file, state.file);
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
