import { vi } from 'vitest';

import { fakeDocumentMock } from './fake-document.mock.ts';
import { switchableMediaQueryMock } from './media-query.mock.ts';
import type { PanelWidths } from '../../../bridge/common/graph-view-state.type.ts';
import type { PanelSashDeps, PanelSashes } from '../../common/panel-sash.type.ts';
import type { PanelSashPageMock } from '../common/panel-sash-page.type.ts';

type TickRunner = () => void;

const ignore = (): void => undefined;

type ObserverSurface = { readonly observe: () => void };

type TickObserverClass = new (callback: TickRunner) => ObserverSurface;

/** An observer class that keeps its callback in `ticks` and observes nothing else. */
const observerClassOf = (ticks: TickRunner[]): TickObserverClass => {
  class TickObserver {
    public constructor(callback: TickRunner) {
      ticks.push(callback);
    }

    public readonly observe = ignore;
  }

  return TickObserver;
};

/**
 * Stubs `document`, `ResizeObserver` and `MutationObserver` and returns the sash page on fake elements, the body `width` px
 * wide, the saved widths `saved` (none for `null`). The caller unstubs the globals.
 */
export const panelSashPageMock = (width: number, saved: PanelWidths | null): PanelSashPageMock => {
  const resizes: TickRunner[] = [];
  const mutations: TickRunner[] = [];
  const written: Record<string, string> = {};
  const reads = { count: 0 };
  const state = { width };
  const overlay = switchableMediaQueryMock(false);
  const savePanelWidths = vi.fn<(widths: PanelWidths) => void>();

  vi.stubGlobal('document', fakeDocumentMock());
  vi.stubGlobal('ResizeObserver', observerClassOf(resizes));
  vi.stubGlobal('MutationObserver', observerClassOf(mutations));

  const setProperty = (name: string, value: string): void => {
    written[name] = value;
  };
  const style = { setProperty };
  const body = Object.assign(document.createElement('div'), { style });

  Object.defineProperty(body, 'clientWidth', {
    get: (): number => {
      reads.count += 1;

      return state.width;
    }
  });

  const sashes: PanelSashes = { controls: document.createElement('div'), details: document.createElement('div') };
  const store = { panelWidths: (): PanelWidths | null => saved, savePanelWidths };
  const deps: PanelSashDeps = { root: document.createElement('div'), body, sashes, overlay: overlay.query, store };
  const mock: PanelSashPageMock = {
    deps,
    written,
    widthReads: (): number => reads.count,
    saved: savePanelWidths,
    setWidth: (px: number): void => {
      state.width = px;
    },
    resizeBody: (): void => resizes.forEach((tick) => tick()),
    mutateRoot: (): void => mutations.forEach((tick) => tick()),
    flipOverlay: overlay.flip
  };

  return mock;
};
