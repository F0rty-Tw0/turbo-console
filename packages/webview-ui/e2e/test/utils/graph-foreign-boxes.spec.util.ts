/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { Page } from '@playwright/test';

import { boxRectOf } from './graph-folders.spec.util.ts';
import { lineSegmentsOf } from './graph-geometry.spec.util.ts';
import { crossesBox } from './graph-lines.spec.util.ts';
import type { ProbeEdgeLine, ProbeFolder } from '../../../src/graph/common/graph-probe.type.ts';
import { FOLDER_ID_PREFIX, FOLDER_PADDING_PX } from '../../../src/graph/common/graph.const.ts';
import type { ElementRect } from '../../common/playwright.type.ts';

/** The folder boxes the probe reports, in page pixels; runs in the page through `evaluate`. */
export const readFolders = async (page: Page): Promise<ProbeFolder[]> =>
  page.evaluate((): ProbeFolder[] => window.__tcGraphProbe?.folders() ?? []);

/** A drawn box of `folder` at the rendered centre `(renderedX, renderedY)` whose direct children are `packages`. */
export const folderAt = (folder: string, packages: string[], centre: [number, number], size: [number, number]): ProbeFolder => {
  const [renderedX, renderedY] = centre;
  const [renderedWidth, renderedHeight] = size;
  const probeFolder: ProbeFolder = {
    folder,
    isCollapsed: false,
    isVisible: true,
    state: 'normal',
    renderedX,
    renderedY,
    renderedWidth,
    renderedHeight,
    width: renderedWidth,
    text: '',
    textMaxWidth: 0,
    packages
  };

  return probeFolder;
};

const folderKeyOf = (childId: string): string => childId.slice(FOLDER_ID_PREFIX.length);

const isFolderChild = (childId: string): boolean => childId.startsWith(FOLDER_ID_PREFIX);

/** `folder` holds the package `id` directly or in a box nested in it, at any depth. */
const holdsPackage = (folders: ProbeFolder[], folder: ProbeFolder, id: string): boolean => {
  const nestedKeys = folder.packages.filter(isFolderChild).map(folderKeyOf);
  const holdsInKey = (key: string): boolean => {
    const nested = folders.find((candidate): boolean => candidate.folder === key);

    return nested !== undefined && holdsPackage(folders, nested, id);
  };

  return folder.packages.includes(id) || nestedKeys.some(holdsInKey);
};

const isDrawnBox = (folder: ProbeFolder): boolean => folder.isVisible && !folder.isCollapsed;

/** The box's title band, its top `FOLDER_PADDING_PX` at `zoom`, then the whole box. */
const bandAndBodyOf = (folder: ProbeFolder, zoom: number): ElementRect[] => {
  const body = boxRectOf(folder);
  const band: ElementRect = { ...body, height: Math.min(body.height, FOLDER_PADDING_PX * zoom) };

  return [band, body];
};

/**
 * How many times a drawn line crosses the title band or the body of a drawn box that holds neither of its ends: each
 * pair of a line and a foreign box counts once for its band and once for its body. A box that holds an end is the line's
 * own, and the lines that enter it through its title band are left out (U6c OQ1).
 */
export const foreignBoxHitsOf = (lines: ProbeEdgeLine[], folders: ProbeFolder[], zoom: number): number => {
  const drawnBoxes = folders.filter(isDrawnBox);
  const hitsOf = (line: ProbeEdgeLine): number => {
    const segments = lineSegmentsOf(line);
    const isForeign = (folder: ProbeFolder): boolean =>
      !holdsPackage(folders, folder, line.source) && !holdsPackage(folders, folder, line.target);
    const foreignBoxes = drawnBoxes.filter(isForeign);
    const rects = foreignBoxes.flatMap((folder): ElementRect[] => bandAndBodyOf(folder, zoom));
    const crossedRects = rects.filter((rect): boolean => segments.some((segment): boolean => crossesBox(segment, rect)));

    return line.isDrawn ? crossedRects.length : 0;
  };

  return lines.map(hitsOf).reduce((sum, hits): number => sum + hits, 0);
};
