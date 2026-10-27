import type { Mocked } from 'vitest';
import { vi } from 'vitest';

import type { Position } from '../../../bridge/common/graph-state.type.ts';
import type { ControlsMounted, ControlsRowsHost } from '../../common/graph-controls.type.ts';
import type { GraphFilters } from '../../common/graph-filters.type.ts';
import type { DrawnGraph, GraphView, Viewport } from '../../common/graph-page.type.ts';
import type { RevealDeps, RevealFolders, RevealInspection, RevealLayouts, RevealTaskMode } from '../../common/graph-reveal.type.ts';
import { buildControls } from '../../ui/controls-elements.ts';
import type { RevealDepsMock } from '../common/graph-reveal.type.ts';

const ORIGIN: Position = { x: 0, y: 0 };

/**
 * Fakes of every reveal dep over `graph`, its controls mounted with `applied`: package mode, no layout in flight, the
 * flat mode, nothing collapsed (an expand takes its folders out) and the camera at zoom 1. Needs the fake `document` for the controls panel.
 */
export const revealDepsMock = (graph: DrawnGraph, applied: GraphFilters): RevealDepsMock => {
  const log: string[] = [];
  const collapsed = new Set<string>();
  const mounted: ControlsMounted = { graph, elements: buildControls([], []) };
  const camera: Viewport = { zoom: 1, pan: ORIGIN };
  const tasks: Mocked<RevealTaskMode> = {
    isActive: vi.fn<RevealTaskMode['isActive']>(() => false),
    leave: vi.fn<RevealTaskMode['leave']>(() => void log.push('leave'))
  };
  const layouts: Mocked<RevealLayouts> = {
    isPlacing: vi.fn<RevealLayouts['isPlacing']>(() => false),
    mode: vi.fn<RevealLayouts['mode']>(() => 'flat')
  };
  const drawn = vi.fn<RevealDeps['drawn']>(() => graph);
  const edit = vi.fn<ControlsRowsHost['edit']>(() => void log.push('edit'));
  const expandFolders = (folders: Iterable<string>): void => {
    const opened = [...folders];

    for (const folder of opened) collapsed.delete(folder);

    log.push(`expand ${opened.join(' ')}`);
  };
  const folders: Mocked<RevealFolders> = {
    collapsed: vi.fn<RevealFolders['collapsed']>(() => collapsed),
    expand: vi.fn<RevealFolders['expand']>(expandFolders)
  };
  const inspection: Mocked<RevealInspection> = {
    select: vi.fn<RevealInspection['select']>((name: string): void => void log.push(`select ${name}`))
  };
  const view: Mocked<Pick<GraphView, 'viewport' | 'setViewport'>> = {
    viewport: vi.fn<GraphView['viewport']>(() => camera),
    setViewport: vi.fn<GraphView['setViewport']>((zoom: number): void => void log.push(`setViewport ${zoom}`))
  };
  const controls = { mounted, applied, edit };
  const filtering = { controls, folders };
  const deps: RevealDeps = { tasks, layouts, drawn, filtering, inspection, view };
  const mock: RevealDepsMock = { deps, log, mounted, collapsed, tasks, layouts, drawn, edit, folders, inspection, view };

  return mock;
};
