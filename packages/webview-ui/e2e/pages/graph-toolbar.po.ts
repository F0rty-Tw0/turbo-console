import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { GraphIconId } from '../../src/graph/common/graph-icon.type.ts';
import { CLEAR_LABEL, CONTROLS_LABEL, FILTERS_ON_TEXT, PANELS_LABEL } from '../../src/graph/common/graph.const.ts';
import type { InputOptionColors, ToolbarGroup } from '../common/graph.type.ts';
import { CODICON_LOADED } from '../common/shell.const.ts';
import { setInputOptionVars } from '../test/utils/graph-details.spec.util.ts';

const CONTROLS_BUTTON = /^Controls/;

/** The toolbar's structure and look: groups, separators, icons, the pressed toggles and the "filters on" mark. */
export class GraphToolbar {
  public readonly controlsButton: Locator;
  public readonly filtersOn: Locator;
  public readonly toolbar: Locator;

  private readonly page: Page;
  private colors: InputOptionColors | null;

  public constructor(page: Page) {
    this.page = page;
    this.colors = null;
    this.toolbar = page.getByRole('group', { name: PANELS_LABEL, exact: true }).locator('..');
    this.controlsButton = page.getByRole('button', { name: CONTROLS_BUTTON });
    this.filtersOn = this.controlsButton.locator('span').filter({ hasText: FILTERS_ON_TEXT }).first();
  }

  /** Sets the three input-option colours on the root with the CSSOM, as `GraphLook.applyTheme` sets a theme variable. */
  public async setInputOptionVars(colors: InputOptionColors): Promise<void> {
    this.colors = colors;
    await this.page.evaluate(setInputOptionVars, colors);
  }

  /** Each group by its accessible name holds exactly these buttons, in order; "Clear selection" sits in neither. */
  public async expectGroups(groups: ToolbarGroup[]): Promise<void> {
    for (const group of groups) await this.expectGroup(group);

    await expect(this.toolbar.locator(':scope > button')).toHaveText([CLEAR_LABEL]);
  }

  /** The toolbar's own `aria-hidden` spans that are not icons. */
  public async expectSeparators(count: number): Promise<void> {
    await expect(this.toolbar.locator(':scope > span[aria-hidden="true"]:not(.codicon)')).toHaveCount(count);
  }

  /** The button holds an `aria-hidden` icon span with the id's Codicon class. */
  public async expectIcon(button: string, iconId: GraphIconId): Promise<void> {
    const icon = this.page.getByRole('button', { name: button, exact: true }).locator('span').first();

    await expect(icon).toHaveClass(new RegExp(`codicon-${iconId}`));
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
  }

  public async expectCodiconLoaded(): Promise<void> {
    await expect.poll(async (): Promise<unknown> => this.page.evaluate(CODICON_LOADED)).toBe(true);
  }

  /** A pressed toggle is drawn in the three input-option colours; a collapsed one in none of them. */
  public async expectPressed(button: string, isPressed: boolean): Promise<void> {
    const colors = this.colors;

    if (colors === null) throw new Error('graph e2e: setInputOptionVars must run first');

    const toggle = this.page.getByRole('button', { name: button, exact: true });
    const looks: [string, string][] = [
      ['background-color', colors.background],
      ['border-color', colors.border],
      ['color', colors.foreground]
    ];
    const pressed = expect(toggle);
    const collapsed = pressed.not;
    const assertion = isPressed ? pressed : collapsed;

    for (const [property, value] of looks) await assertion.toHaveCSS(property, value);
  }

  /** The Controls button reads "filters on" with a `filter` icon and is named "Controls (filters on)", or shows none of it. */
  public async expectFiltersOn(isOn: boolean): Promise<void> {
    const name = isOn ? `${CONTROLS_LABEL} (${FILTERS_ON_TEXT})` : CONTROLS_LABEL;

    await expect(this.controlsButton).toHaveAccessibleName(name);
    await expect(this.filtersOn).toBeVisible({ visible: isOn });
    await expect(this.filtersOn.locator('span').first()).toHaveClass(/codicon-filter/);
    await expect(this.page.locator('.has-filters')).toHaveCount(0);
  }

  private async expectGroup(group: ToolbarGroup): Promise<void> {
    const buttons = this.page.getByRole('group', { name: group.name, exact: true }).getByRole('button');

    await expect(buttons).toHaveText(group.buttons, { useInnerText: true });
  }
}
