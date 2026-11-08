import { describe, expect, it } from 'vitest';

import { countsOf, idsNotEndingOn, isReady, routedLinksOf, routedPackageEndOf } from './graph-folder-links.spec.util.ts';
import { folderAt } from './graph-foreign-boxes.spec.util.ts';
import { nodeAt } from './graph-geometry.spec.util.ts';
import { lineThrough } from './graph-lines.spec.util.ts';
import type { ProbeRect } from '../../../src/graph/common/graph-probe-titles.type.ts';
import type { ProbeEdgeLine, ProbeFolder, ProbeFolderLink, ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import type { LinkRead, RoutedLink } from '../../common/graph-folder-links.type.ts';
import type { ViewportPoint } from '../../common/playwright.type.ts';

/** The collapsed node of `apps`: x 70-130, y 84-116 at zoom 1, so its border ring runs from 3 px inside to 8 px outside. */
const APPS_BOX: ProbeFolder = folderAt('apps', [], [100, 100], [60, 32]);

const APPS: ProbeFolder = { ...APPS_BOX, isCollapsed: true };

const SIZED: ProbeRect = { left: 300, top: 300, width: 40, height: 17 };

const NO_SIZE: ProbeRect = { left: 0, top: 0, width: 0, height: 0 };

const FAR: ViewportPoint = { x: 200, y: 100 };

const linkOf = (source: string, target: string, labelBox: ProbeRect = SIZED): ProbeFolderLink => {
  const link: ProbeFolderLink = { source, target, count: 1, isDrawn: true, state: 'normal', labelBox };

  return link;
};

const readOf = (links: ProbeFolderLink[], lines: ProbeEdgeLine[], nodes: ProbeNode[] = []): LinkRead => {
  const folders = [APPS];
  const read: LinkRead = { links, lines, folders, nodes, zoom: 1 };

  return read;
};

/** A line from the collapsed `apps` end at (`endX`, 100) to a point far to the right. */
const fromApps = (endX: number): ProbeEdgeLine => {
  const end: ViewportPoint = { x: endX, y: 100 };

  return lineThrough('apps', 'pkg', [end, FAR]);
};

/** A line from a point far to the right to the collapsed `apps` end at (`endX`, 100). */
const toApps = (endX: number): ProbeEdgeLine => {
  const end: ViewportPoint = { x: endX, y: 100 };

  return lineThrough('pkg', 'apps', [FAR, end]);
};

const bentFromApps = (target: string): ProbeEdgeLine => {
  const bend: ViewportPoint = { x: 250, y: 150 };
  const end: ViewportPoint = { x: 300, y: 100 };

  return lineThrough('apps', target, [FAR, bend, end]);
};

describe('FEATURE: countsOf offBorder', () => {
  it.each([
    { title: 'the end on the right border', endX: 130, faults: 0 },
    { title: 'the end 2 px inside the border', endX: 128, faults: 0 },
    { title: 'the end 5 px outside the border', endX: 135, faults: 0 },
    { title: 'the end at the node centre', endX: 100, faults: 1 },
    { title: 'the end 4 px inside the border', endX: 126, faults: 1 },
    { title: 'the end 20 px outside the border', endX: 150, faults: 1 }
  ])('GIVEN $title WHEN the source is collapsed THEN $faults faults', ({ endX, faults }) => {
    const read = readOf([linkOf('apps', 'pkg')], [fromApps(endX)]);

    expect(countsOf(read).offBorder).toBe(faults);
  });

  it('GIVEN the target is the collapsed folder WHEN its end is the line last point THEN that end is checked', () => {
    const atCentre = readOf([linkOf('pkg', 'apps')], [toApps(100)]);
    const onBorder = readOf([linkOf('pkg', 'apps')], [toApps(130)]);

    expect(countsOf(atCentre).offBorder).toBe(1);
    expect(countsOf(onBorder).offBorder).toBe(0);
  });

  it('GIVEN a link that ends on no collapsed folder WHEN counted THEN it is a fault, so a key mismatch cannot pass', () => {
    const read = readOf([linkOf('other', 'pkg')], [fromApps(130)]);

    expect(countsOf(read).offBorder).toBe(1);
  });
});

describe('FEATURE: countsOf labelsOnLine and routed', () => {
  const crossingStart: ViewportPoint = { x: 300, y: 308 };
  const crossingEnd: ViewportPoint = { x: 340, y: 308 };
  const besideStart: ViewportPoint = { x: 300, y: 340 };
  const besideEnd: ViewportPoint = { x: 340, y: 340 };
  const crossing = lineThrough('apps', 'pkg', [crossingStart, crossingEnd]);
  const beside = lineThrough('apps', 'pkg', [besideStart, besideEnd]);

  it.each([
    { title: 'a line through its label', line: crossing, onLine: 1 },
    { title: 'a line clear of its label', line: beside, onLine: 0 }
  ])('GIVEN $title WHEN counted THEN labelsOnLine is $onLine', ({ line, onLine }) => {
    const read = readOf([linkOf('apps', 'pkg')], [line]);

    expect(countsOf(read).labelsOnLine).toBe(onLine);
  });

  it('GIVEN one straight and one bent line WHEN counted THEN routed is 1', () => {
    const straight = fromApps(130);
    const read = readOf([linkOf('apps', 'a'), linkOf('apps', 'pkg')], [bentFromApps('a'), straight]);

    expect(countsOf(read).routed).toBe(1);
  });
});

describe('FEATURE: isReady', () => {
  const line = fromApps(130);
  const drawn = linkOf('apps', 'pkg');
  const hidden: ProbeFolderLink = { ...drawn, isDrawn: false };

  it.each([
    { title: 'one drawn link with a sized label and a line', read: readOf([linkOf('apps', 'pkg')], [line]), ready: true },
    { title: 'no link', read: readOf([], []), ready: false },
    { title: 'a link with no line', read: readOf([linkOf('apps', 'pkg')], []), ready: false },
    { title: 'a link whose label has no size', read: readOf([linkOf('apps', 'pkg', NO_SIZE)], [line]), ready: false },
    { title: 'a link that is not drawn', read: readOf([hidden], [line]), ready: false }
  ])('GIVEN $title WHEN read THEN ready is $ready', ({ read, ready }) => {
    expect(isReady(read)).toBe(ready);
  });
});

describe('FEATURE: routed links', () => {
  const nodes = [nodeAt('a', 300, 100), nodeAt('b', 300, 200)];
  const read = readOf([linkOf('apps', 'b'), linkOf('apps', 'a')], [bentFromApps('b'), bentFromApps('a')], nodes);
  const targetOf = (link: RoutedLink): string => link.target;
  const idOf = (link: RoutedLink): string => link.id;
  const isLinkToB = (link: RoutedLink): boolean => link.target === 'b';

  it('GIVEN two routed links WHEN listed THEN they come in id order', () => {
    const links = routedLinksOf(read);

    expect(links.map(targetOf)).toStrictEqual(['a', 'b']);
  });

  it('GIVEN two routed links to packages WHEN the end is picked THEN it is the first package by name', () => {
    expect(routedPackageEndOf(read)).toBe('a');
  });

  it('GIVEN no routed link WHEN the end is picked THEN it throws', () => {
    const none = readOf([], []);

    expect(() => routedPackageEndOf(none)).toThrow('no routed folder link ends on a package');
  });

  it('GIVEN a dragged package WHEN the kept ids are read THEN the link to it is left out', () => {
    const links = routedLinksOf(read);
    const toB = links.filter(isLinkToB);

    expect(idsNotEndingOn(links, 'a')).toStrictEqual(toB.map(idOf));
  });
});
