import type { ProbeFolder, ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import { FOLDER_PADDING_PX } from '../../../src/graph/common/graph.const.ts';
import type { ElementRect, ViewportPoint } from '../../common/playwright.type.ts';

/** The most two boxes may overlap by, in CSS pixels, before they count as overlapping. */
const OVERLAP_TOLERANCE_PX = 0.5;

/** The most a box's frame may reach past the canvas, in CSS pixels, before it counts as cut. */
const CLIP_TOLERANCE_PX = 0.5;

export const folderKeyed = (folders: ProbeFolder[], key: string): ProbeFolder => {
  const folder = folders.find((candidate): boolean => candidate.folder === key);

  if (folder === undefined) throw new Error(`graph e2e: no box for folder '${key}' is drawn`);

  return folder;
};

/** A box as a rect in page pixels, from its rendered centre and size. */
export const boxRectOf = (folder: ProbeFolder): ElementRect => {
  const rect: ElementRect = {
    left: folder.renderedX - folder.renderedWidth / 2,
    top: folder.renderedY - folder.renderedHeight / 2,
    width: folder.renderedWidth,
    height: folder.renderedHeight
  };

  return rect;
};

/** The package's rendered centre lies inside `rect`, edges included. */
export const holdsCentre = (rect: ElementRect, node: ProbeNode): boolean => {
  const isAcross = node.renderedX >= rect.left && node.renderedX <= rect.left + rect.width;
  const isDown = node.renderedY >= rect.top && node.renderedY <= rect.top + rect.height;

  return isAcross && isDown;
};

/** What each box gets wrong: a member whose centre is outside it, or a non-member whose centre is inside it. */
export const membershipFaultsOf = (folders: ProbeFolder[], nodes: ProbeNode[]): string[] => {
  const faultsOf = (folder: ProbeFolder): string[] => {
    const rect = boxRectOf(folder);
    const faultOf = (node: ProbeNode): string[] => {
      const isMember = folder.packages.includes(node.id);
      const isInside = holdsCentre(rect, node);

      if (isMember === isInside) return [];

      return [`${node.id} is ${isMember ? 'outside' : 'inside'} the box of '${folder.folder}'`];
    };

    return nodes.flatMap(faultOf);
  };

  return folders.flatMap(faultsOf);
};

/** How far two rects overlap along their thinner shared side; 0 when they only touch or part. */
const overlapDepthOf = (first: ElementRect, second: ElementRect): number => {
  const across = Math.min(first.left + first.width, second.left + second.width) - Math.max(first.left, second.left);
  const down = Math.min(first.top + first.height, second.top + second.height) - Math.max(first.top, second.top);

  return Math.max(0, Math.min(across, down));
};

/** Each pair of boxes that overlap by more than half a pixel. */
export const overlapFaultsOf = (folders: ProbeFolder[]): string[] => {
  const faultsAfter = (first: ProbeFolder, index: number): string[] => {
    const rest = folders.slice(index + 1);
    const firstRect = boxRectOf(first);
    const isOverlapping = (second: ProbeFolder): boolean => overlapDepthOf(firstRect, boxRectOf(second)) > OVERLAP_TOLERANCE_PX;
    const nameOf = (second: ProbeFolder): string => `'${first.folder}' overlaps '${second.folder}'`;

    return rest.filter(isOverlapping).map(nameOf);
  };

  return folders.flatMap(faultsAfter);
};

/**
 * A point in the box's left padding band, half the band in from its frame and level with its centre: no package sits
 * in the band and the links, laid out downwards, enter boxes from the top and bottom.
 */
export const boxGrabOf = (folder: ProbeFolder, zoom: number): ViewportPoint => {
  const rect = boxRectOf(folder);
  const point: ViewportPoint = { x: rect.left + (FOLDER_PADDING_PX * zoom) / 2, y: folder.renderedY };

  return point;
};

/** Each box whose frame reaches past the canvas by more than half a pixel. */
export const clipFaultsOf = (canvas: ElementRect, folders: ProbeFolder[]): string[] => {
  const isClipped = (folder: ProbeFolder): boolean => {
    const rect = boxRectOf(folder);
    const isLeftCut = rect.left < canvas.left - CLIP_TOLERANCE_PX;
    const isTopCut = rect.top < canvas.top - CLIP_TOLERANCE_PX;
    const isRightCut = rect.left + rect.width > canvas.left + canvas.width + CLIP_TOLERANCE_PX;
    const isBottomCut = rect.top + rect.height > canvas.top + canvas.height + CLIP_TOLERANCE_PX;

    return isLeftCut || isTopCut || isRightCut || isBottomCut;
  };
  const nameOf = (folder: ProbeFolder): string => `the box of '${folder.folder}' reaches past the canvas`;

  return folders.filter(isClipped).map(nameOf);
};
