import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { MODULE_CONTROLS_ID, MODULE_DETAILS_ID } from '../common/graph-module-panels.const.ts';

type ModulePanel = 'controls' | 'details';

type PanelToggle = 'Controls' | 'Details';

/** The Controls name can carry the "filters on" mark, so both match as prefixes. */
const TOGGLE_NAMES: Readonly<Record<PanelToggle, RegExp>> = { Controls: /^Controls/, Details: /^Details/ };

/** The package graph's own parts, which modules mode hides (spec AC 1, AC 14). */
const PACKAGE_PARTS = ['#graph-controls', '#graph-details', '.legend-button', '.graph-legend', '.widget-row', '.graph-location'];

/**
 * The toolbar's Panels toggles and the two module asides: Controls with its Focus section (the target line and Clear focus)
 * and its Focus depth, and Details. Every Controls query stays inside `#graph-module-controls`, so its Clear focus never
 * collides with the one in Details.
 */
export class GraphModulePanels {
  public readonly controls: Locator;
  public readonly details: Locator;

  private readonly page: Page;
  private readonly controlsToggle: Locator;
  private readonly detailsToggle: Locator;
  private readonly focusTarget: Locator;
  private readonly clearFocus: Locator;
  private readonly depth: Locator;

  public constructor(page: Page) {
    const panels = page.getByRole('group', { name: 'Panels', exact: true });
    const focusHeading = page.getByRole('heading', { level: 3, name: 'Focus', exact: true, includeHidden: true });
    const focusSection = page.locator('section.controls-section').filter({ has: focusHeading });

    this.page = page;
    this.controls = page.locator(`#${MODULE_CONTROLS_ID}`);
    this.details = page.locator(`#${MODULE_DETAILS_ID}`);
    this.controlsToggle = panels.getByRole('button', { name: TOGGLE_NAMES.Controls });
    this.detailsToggle = panels.getByRole('button', { name: TOGGLE_NAMES.Details });
    this.focusTarget = this.controls.locator(focusSection).locator('p');
    this.clearFocus = this.controls.getByRole('button', { name: 'Clear focus', exact: true, includeHidden: true });
    this.depth = this.controls.getByRole('spinbutton', { name: 'Focus depth', exact: true, includeHidden: true });
  }

  public async toggle(label: PanelToggle): Promise<void> {
    const button = label === 'Controls' ? this.controlsToggle : this.detailsToggle;

    await button.click();
  }

  public async setDepth(depth: number): Promise<void> {
    await this.depth.fill(String(depth));
  }

  public async pressClearFocus(): Promise<void> {
    await this.clearFocus.click();
  }

  public async expectOpen(panel: ModulePanel, isOpen: boolean): Promise<void> {
    const aside = panel === 'controls' ? this.controls : this.details;

    await expect(aside).toBeVisible({ visible: isOpen });
  }

  /** The Controls and Details toggles' `aria-controls` name these aside ids. */
  public async expectToggleTargets(controlsId: string, detailsId: string): Promise<void> {
    await expect(this.controlsToggle).toHaveAttribute('aria-controls', controlsId);
    await expect(this.detailsToggle).toHaveAttribute('aria-controls', detailsId);
  }

  /** The Focus section's line reads exactly `text`: the target's path or package name, or None. */
  public async expectFocusText(text: string): Promise<void> {
    await expect(this.focusTarget).toHaveText(text);
  }

  public async expectClearFocusShown(isShown: boolean): Promise<void> {
    await expect(this.clearFocus).toBeVisible({ visible: isShown });
  }

  public async expectDepth(depth: number): Promise<void> {
    await expect(this.depth).toHaveValue(String(depth));
  }

  /** No package Controls, package Details, legend, widget row or location shows. */
  public async expectPackagePartsHidden(): Promise<void> {
    for (const selector of PACKAGE_PARTS) {
      const shown = this.page.locator(selector).filter({ visible: true });

      await expect(shown, selector).toHaveCount(0);
    }
  }
}
