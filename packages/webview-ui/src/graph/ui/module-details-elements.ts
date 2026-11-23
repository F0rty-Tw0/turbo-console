import { buildDetailsContent } from './details-elements.ts';
import { importsView } from './details-imports.ts';
import { leadOf } from './details-parts.ts';
import { iconTextButton } from './icon-button.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { ImportsViewModel } from '../common/details-imports.type.ts';
import type { DetailsElements } from '../common/details-view.type.ts';
import { MODULE_DETAILS_EMPTY_TEXT, MODULE_DETAILS_ID } from '../common/graph-module.const.ts';
import { DETAILS_LABEL } from '../common/graph.const.ts';
import type {
  ModuleDetailsBlock,
  ModuleDetailsElements,
  ModuleDetailsFile,
  ModuleDetailsLink,
  ModuleDetailsList,
  ModuleDetailsStub,
  ModuleDetailsView
} from '../common/module-details.type.ts';
import { focusFaceOf } from '../utils/details-text.util.ts';
import { scanningTextOf } from '../utils/module-text.util.ts';

type ModuleDetailsKind = ModuleDetailsView['kind'];

/** A titled view's parts: its kind, its heading's text, its Focus button (`null` for a link) and its blocks in draw order. */
type TitledParts = {
  readonly kind: ModuleDetailsKind;
  readonly title: string;
  readonly focus: HTMLButtonElement | null;
  readonly blocks: ModuleDetailsBlock[];
};

/** The module Details panel `aside#graph-module-details`, hidden, and its empty content; `GraphModuleDetails` fills the content. */
export const buildModuleDetailsPanel = (): DetailsElements => {
  const panel = textElement('aside', 'graph-details graph-module-details', '');
  const content = buildDetailsContent();

  panel.id = MODULE_DETAILS_ID;
  panel.hidden = true;
  panel.setAttribute('aria-label', DETAILS_LABEL);
  panel.append(content);

  const elements: DetailsElements = { panel, content };

  return elements;
};

const rootOf = (kind: ModuleDetailsKind): HTMLElement => {
  const root = textElement('section', 'details-view', '');

  root.dataset['view'] = kind;

  return root;
};

const leadViewOf = (kind: ModuleDetailsKind, text: string): ModuleDetailsElements => {
  const root = rootOf(kind);
  const lead = leadOf(text);

  root.append(lead);

  const elements: ModuleDetailsElements = { root, heading: null, focus: null, blocks: [] };

  return elements;
};

const blockOf = (list: ModuleDetailsList, model: ImportsViewModel): ModuleDetailsBlock => {
  const details = importsView(model);
  const block: ModuleDetailsBlock = { list, details };

  return block;
};

/** Focus, or Clear focus while the shown end is the focus, each with its action icon. */
const focusButtonOf = (isFocused: boolean): HTMLButtonElement => {
  const face = focusFaceOf(isFocused);

  return iconTextButton(face.icon, face.text, face.text);
};

const focusNodesOf = (focus: HTMLButtonElement | null): HTMLElement[] => {
  if (focus === null) return [];

  return [focus];
};

/** The title row with the heading (`tabIndex = -1`, so focus can land on it), then Focus, then each block. */
const titledViewOf = (parts: TitledParts): ModuleDetailsElements => {
  const { kind, title, focus, blocks } = parts;
  const root = rootOf(kind);
  const row = textElement('div', 'details-title', '');
  const heading = textElement('h2', 'details-heading', title);
  const focusNodes = focusNodesOf(focus);
  const blockRoots = blocks.map((block) => block.details.root);

  heading.tabIndex = -1;
  row.append(heading);
  root.append(row, ...focusNodes, ...blockRoots);

  const elements: ModuleDetailsElements = { root, heading, focus, blocks };

  return elements;
};

const fileViewOf = (view: ModuleDetailsFile, isFocused: boolean): ModuleDetailsElements => {
  const focus = focusButtonOf(isFocused);
  const imports = blockOf('imports', view.imports);
  const importedBy = blockOf('importedBy', view.importedBy);
  const blocks = [imports, importedBy];
  const parts: TitledParts = { kind: view.kind, title: view.path, focus, blocks };

  return titledViewOf(parts);
};

const stubViewOf = (view: ModuleDetailsStub, isFocused: boolean): ModuleDetailsElements => {
  const focus = focusButtonOf(isFocused);
  const importedBy = blockOf('importedBy', view.importedBy);
  const blocks = [importedBy];
  const parts: TitledParts = { kind: view.kind, title: view.name, focus, blocks };

  return titledViewOf(parts);
};

const linkViewOf = (view: ModuleDetailsLink): ModuleDetailsElements => {
  const imports = blockOf('imports', view.imports);
  const blocks = [imports];
  const parts: TitledParts = { kind: view.kind, title: view.title, focus: null, blocks };

  return titledViewOf(parts);
};

/**
 * One module Details view, unwired, its repo text set through `textContent` only (spec §6.3): the empty hint, the scan
 * line, or a file, stub or link with its imports blocks. `isFocused` turns a file's or stub's Focus into Clear focus.
 */
export const buildModuleDetailsView = (view: ModuleDetailsView, isFocused: boolean): ModuleDetailsElements => {
  if (view.kind === 'empty') return leadViewOf(view.kind, MODULE_DETAILS_EMPTY_TEXT);

  if (view.kind === 'loading') return leadViewOf(view.kind, scanningTextOf(view.packageName));

  if (view.kind === 'file') return fileViewOf(view, isFocused);

  if (view.kind === 'stub') return stubViewOf(view, isFocused);

  return linkViewOf(view);
};
