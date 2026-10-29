import { closureOf } from './closure.util.ts';
import { folderTitleOf } from './controls-text.util.ts';
import { folderLinkOf } from './folder-links.util.ts';
import { bundleSummaryOf, folderStatusText } from './folder-text.util.ts';
import { neighboursOf } from './neighbours.util.ts';
import { pluralOf } from './plural.util.ts';
import { selectionText } from './selection-text.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { HINT_NUDGE_TEXT } from '../common/details.const.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { BundleInspection, Inspection, TraceInspection } from '../common/inspection.type.ts';
import type { TraceResult } from '../common/trace.type.ts';

const packageText = (name: string, edges: GraphEdge[]): string => {
  const closure = closureOf(name, edges);
  const direct = neighboursOf(name, edges);

  return selectionText(name, closure, direct);
};

/** A trace reads start → end whichever way its path runs (D21); hidden path packages are counted after it. */
const traceText = (inspection: TraceInspection, trace: TraceResult | null, visible: ReadonlySet<string>): string => {
  const { start, end } = inspection;

  if (trace === null) return '';

  if (trace.direction === 'none') return `No dependency path between ${start} and ${end}`;

  const isHidden = (name: string): boolean => !visible.has(name);
  const hidden = trace.path.filter(isHidden).length;
  const packages = pluralOf(trace.path.length, 'package', 'packages');
  const hiddenText = hidden > 0 ? `, ${hidden} hidden` : '';

  return `Trace ${start} → ${end}: ${packages}${hiddenText}`;
};

const folderText = (folder: string, scene: FolderScene | null): string => {
  if (scene === null) return '';

  const title = folderTitleOf(folder);

  return folderStatusText(title, scene, folder);
};

const bundleText = (inspection: BundleInspection, scene: FolderScene | null): string => {
  const link = folderLinkOf(scene, inspection.source, inspection.target);

  if (link === null) return '';

  return bundleSummaryOf(link);
};

/**
 * The toolbar status line for an inspection (spec §4.3); `''` for none, a trace not yet walked, a folder with no scene,
 * and a bundle the scene does not draw.
 */
export const inspectionTextOf = (
  inspection: Inspection,
  edges: GraphEdge[],
  trace: TraceResult | null,
  visible: ReadonlySet<string>,
  scene: FolderScene | null
  // eslint-disable-next-line max-params -- five inputs, pinned by the plan's Interfaces (Task 3.3)
): string => {
  switch (inspection.kind) {
    case 'none':
      return '';
    case 'bundle':
      return bundleText(inspection, scene);
    case 'package':
      return packageText(inspection.name, edges);
    case 'link':
      return `${inspection.source} depends on ${inspection.target}`;
    case 'folder':
      return folderText(inspection.folder, scene);
    case 'picking':
      return inspection.isNudged ? HINT_NUDGE_TEXT : `Trace from ${inspection.start}: select the end package`;
    case 'trace':
      return traceText(inspection, trace, visible);
  }
};
