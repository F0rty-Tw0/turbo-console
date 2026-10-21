import type { ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import type { ElementRect, ViewportPoint } from '../../common/playwright.type.ts';

const CORNER_INSET = 12;

/** A node's box in page pixels at `zoom`, from its rendered centre. */
export const nodeBoxOf = (node: ProbeNode, zoom: number): ElementRect => {
  const width = node.width * zoom;
  const height = node.height * zoom;
  const box: ElementRect = { left: node.renderedX - width / 2, top: node.renderedY - height / 2, width, height };

  return box;
};

const isInsideBox = (point: ViewportPoint, box: ElementRect): boolean => {
  const isAcross = point.x >= box.left && point.x <= box.left + box.width;
  const isDown = point.y >= box.top && point.y <= box.top + box.height;

  return isAcross && isDown;
};

/** The first of the container's four inset corners that lies outside every node box; throws when none does. */
export const emptySpotOf = (container: ElementRect, nodes: ProbeNode[], zoom: number): ViewportPoint => {
  const near = CORNER_INSET;
  const left = container.left + near;
  const top = container.top + near;
  const right = container.left + container.width - near;
  const bottom = container.top + container.height - near;
  const corners: ViewportPoint[] = [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom }
  ];
  const boxes = nodes.map((node): ElementRect => nodeBoxOf(node, zoom));
  const isEmpty = (corner: ViewportPoint): boolean => !boxes.some((box): boolean => isInsideBox(corner, box));
  const spot = corners.find(isEmpty);

  if (spot === undefined) throw new Error('graph e2e: every container corner is covered by a node');

  return spot;
};
