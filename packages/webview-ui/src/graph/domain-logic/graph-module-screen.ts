import type { ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { MODULES_MODE_CLASS, MODULE_SHOWN_CAP } from '../common/graph-module.const.ts';
import type { ModuleRedraw, ModuleScreen, ModuleScreenDeps } from '../common/module-mode.type.ts';
import type { ModulesBarElements } from '../common/modules-bar.type.ts';
import { moduleBannerOf, moduleFailedTextOf, moduleStatusOf, moduleTooltipOf, modulesTitleOf } from '../utils/module-banner.util.ts';
import { scanningTextOf } from '../utils/module-text.util.ts';

/** The banner shows `text`, Retry only with the failed one; `null` hides both. */
const showBanner = (bar: ModulesBarElements, text: string | null, canRetry: boolean): void => {
  bar.bannerText.textContent = text ?? '';
  bar.banner.hidden = text === null;
  bar.retry.hidden = !canRetry;
};

/** Title, counts, tooltip and banner of a found scan; the counts read the payload, so toggles never change them. */
const showFound = (bar: ModulesBarElements, name: string, found: ModulesFound): void => {
  const banner = moduleBannerOf(found);

  bar.title.textContent = modulesTitleOf(name);
  bar.status.textContent = moduleStatusOf(found);
  bar.status.title = moduleTooltipOf(found);
  showBanner(bar, banner, false);
};

/** Draws the view, then shows the slow notice when more than `MODULE_SHOWN_CAP` leaves are on screen and reports the scene drawn. */
const drawAndWarn = async (
  deps: ModuleScreenDeps,
  found: ModulesFound,
  view: ModulesViewState,
  redraw: ModuleRedraw
): Promise<void> => {
  const { layout, page } = deps;

  await layout.draw(found, view, redraw);

  const drawn = layout.scene();
  const leafCount = drawn?.leafCount ?? 0;

  page.modules.slow.hidden = leafCount <= MODULE_SHOWN_CAP;

  if (drawn !== null) deps.onDrawn(drawn);
};

/**
 * The modules screen (spec §7.4): the `modules-mode` class on the page, which shows the modules bar, and the mode buttons,
 * neither pressed while it shows. Waiting and Loading empty the canvas and read "Scanning <P>…"; Shown writes the bar and
 * draws; `drawAgain` only draws; Failed shows "Could not scan <P>." with Retry and,
 * only when no graph is drawn, empties the canvas, drops a draw in flight and empties the status; `reshow` takes the page
 * back from a host message; leaving clears it and presses Packages again, which task mode's enter undoes on a leave to tasks.
 */
export const moduleScreenOf = (deps: ModuleScreenDeps): ModuleScreen => {
  const { page, layout } = deps;
  const bar = page.modules;
  const enter = (): void => {
    page.root.classList.add(MODULES_MODE_CLASS);
    page.packagesMode.setAttribute('aria-pressed', 'false');
    page.taskMode.setAttribute('aria-pressed', 'false');
  };
  const scanning = (name: string): void => {
    bar.title.textContent = modulesTitleOf(name);
    bar.status.textContent = scanningTextOf(name);
    bar.status.title = '';
    bar.refresh.hidden = false;
    bar.slow.hidden = true;
    showBanner(bar, null, false);
    layout.clear();
  };
  const drawAgain = (found: ModulesFound, view: ModulesViewState, redraw: ModuleRedraw): void => {
    void drawAndWarn(deps, found, view, redraw);
  };
  const shown = (name: string, found: ModulesFound, view: ModulesViewState, redraw: ModuleRedraw): void => {
    showFound(bar, name, found);
    drawAgain(found, view, redraw);
  };
  const isDrawn = (): boolean => layout.scene() !== null;
  const failed = (name: string): void => {
    const failedText = moduleFailedTextOf(name);
    const drawn = layout.scene();

    showBanner(bar, failedText, true);

    if (drawn !== null) return;

    layout.clear();
    bar.status.textContent = '';
    bar.status.title = '';
  };
  const reshow = (): void => deps.showGraph(false);
  const exit = (): void => {
    layout.clear();
    page.root.classList.remove(MODULES_MODE_CLASS);
    page.packagesMode.setAttribute('aria-pressed', 'true');
  };
  const screen: ModuleScreen = { enter, scanning, shown, drawAgain, isDrawn, failed, reshow, exit };

  return screen;
};
