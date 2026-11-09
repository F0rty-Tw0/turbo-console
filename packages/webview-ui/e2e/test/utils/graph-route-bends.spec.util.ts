import type { Position } from '../../../src/bridge/common/graph-state.type.ts';
import type { ProbeEdgeLine, ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import type { RouteBends, RouteRead } from '../../common/graph-route.type.ts';

/** `bend`, a page point, as its offset from the umbrella centre in umbrella widths and heights: the same in model px, whatever the camera. */
const fractionOf = (bend: Position, umbrella: ProbeNode, zoom: number): Position => {
  const fraction: Position = {
    x: (bend.x - umbrella.renderedX) / (umbrella.width * zoom),
    y: (bend.y - umbrella.renderedY) / (umbrella.height * zoom)
  };

  return fraction;
};

/** The bends of `line`, between its two ends. */
const bendsOf = (line: ProbeEdgeLine): Position[] => line.points.slice(1, -1);

const NO_BENDS: RouteBends = {};

/** The routed, drawn lines out of `umbrellaId` by target, each with its bends as fractions of the umbrella box; `{}` while the umbrella is not drawn. */
export const routeBendsOf = (read: RouteRead, umbrellaId: string): RouteBends => {
  const umbrella = read.nodes.find((node: ProbeNode): boolean => node.id === umbrellaId);

  if (umbrella === undefined || read.zoom === 0) return NO_BENDS;

  const isRoutedFrom = (line: ProbeEdgeLine): boolean => line.source === umbrellaId && line.isDrawn && line.isRouted;
  const entryOf = (line: ProbeEdgeLine): [string, Position[]] => {
    const toFraction = (bend: Position): Position => fractionOf(bend, umbrella, read.zoom);
    const fractions = bendsOf(line).map(toFraction);

    return [line.target, fractions];
  };
  const entries = read.lines.filter(isRoutedFrom).map(entryOf);

  return Object.fromEntries(entries);
};

const distanceOf = (from: Position, to: Position): number => Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y));

/** The largest a bend of `now` sits from the same bend of `before`, in umbrella fractions; infinite when the targets or a line's bend count differ. */
export const bendShiftOf = (before: RouteBends, now: RouteBends): number => {
  const targets = Object.keys(before);
  const sameTargets = targets.length === Object.keys(now).length && targets.every((target: string): boolean => target in now);

  if (!sameTargets) return Number.POSITIVE_INFINITY;

  const shiftOf = (target: string): number => {
    const was = before[target] ?? [];
    const is = now[target] ?? [];

    if (was.length !== is.length) return Number.POSITIVE_INFINITY;

    const bendShiftAt = (bend: Position, index: number): number => distanceOf(bend, is[index] ?? bend);
    const bendShifts = was.map(bendShiftAt);

    return Math.max(0, ...bendShifts);
  };
  const shifts = targets.map(shiftOf);

  return Math.max(0, ...shifts);
};
