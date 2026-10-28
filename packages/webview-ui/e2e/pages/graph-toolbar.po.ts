import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { GraphIconId } from '../../src/graph/common/graph-icon.type.ts';
import { CONTROLS_LABEL, FILTERS_ON_TEXT, PANELS_LABEL } from '../../src/graph/common/graph.const.ts';
import type { InputOptionColors, ToolbarGroup } from '../common/graph.type.ts';
import { CODICON_LOADED } from '../common/shell.const.ts';
import { codiconClassOf } from '../test/utils/codicon-class.spec.util.ts';
import { setInputOptionVars } from '../test/utils/graph-details.spec.util.ts';

const CONTROLS_BUTTON = /^Controls/;

/** A button's name as the View group shows it: its `aria-label` when it has one (icon-only), else its rendered text. */
const accessibleNamesOf = (buttons: Element[]): string[] => {
  const names = buttons.map((button): string => {
    const label = button.getAttribute('aria-label');
    const isElement = button instanceof HTMLElement;
    const text = isElement ? button.innerText : '';

    return label ?? text.trim();
  });

  return names;
};

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

  /** Each group by its accessible name holds exactly these buttons, in order, and no button stands outside them. */
  public async expectGroups(groups: ToolbarGroup[]): Promise<void> {
    for (const group of groups) await this.expectGroup(group);

    await this.expectNoLoneButton();
  }

  /** No button is the toolbar's own child: Clear selection lives in the Details bar. */
  public async expectNoLoneButton(): Promise<void> {
    await expect(this.toolbar.locator(':scope > button')).toHaveCount(0);
  }

  /** The status line is visually hidden, a 1 px box, while screen readers still read it. */
  public async expectStatusHidden(): Promise<void> {
    const status = this.toolbar.locator('.graph-status');

    await expect(status).toHaveClass(/\bvisually-hidden\b/);

    const box = await status.boundingBox();

    expect([box?.width, box?.height]).toStrictEqual([1, 1]);
  }

  /** The toolbar's own `aria-hidden` spans that are not icons. */
  public async expectSeparators(count: number): Promise<void> {
    await expect(this.toolbar.locator(':scope > span[aria-hidden="true"]:not(.codicon)')).toHaveCount(count);
  }

  /** The button holds an `aria-hidden` icon span with the id's Codicon class. */
  public async expectIcon(button: string, iconId: GraphIconId): Promise<void> {
    const icon = this.toolbar.getByRole('button', { name: button, exact: true }).locator('span').first();

    await expect(icon).toHaveClass(codiconClassOf(iconId));
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
  }

  public async expectCodiconLoaded(): Promise<void> {
    await expect.poll(async (): Promise<unknown> => this.page.evaluate(CODICON_LOADED)).toBe(true);
  }

  /** A pressed toggle is drawn in the three input-option colours; a collapsed one in none of them. */
  public async expectPressed(button: string, isPressed: boolean): Promise<void> {
    const colors = this.inputColors();
    const toggle = this.toolbar.getByRole('button', { name: button, exact: true });
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

  /** A pressed icon toggle has the input-option fill and foreground; an unpressed one another fill. Icon buttons have no border. */
  public async expectIconPressed(toggle: Locator, isPressed: boolean): Promise<void> {
    const colors = this.inputColors();

    if (!isPressed) return expect(toggle).not.toHaveCSS('background-color', colors.background);

    await expect(toggle).toHaveCSS('background-color', colors.background);
    await expect(toggle).toHaveCSS('color', colors.foreground);
  }

  /** A pressed icon toggle under a high contrast theme, which gives it no fill: the input-option border as a 1 px inner ring. */
  public async expectIconRing(toggle: Locator): Promise<void> {
    const colors = this.inputColors();

    await expect(toggle).toHaveCSS('box-shadow', `${colors.border} 0px 0px 0px 1px inset`);
  }

  /** The Controls button reads "filters on" with a `filter` icon and is named "Controls (filters on)", or shows none of it. */
  public async expectFiltersOn(isOn: boolean): Promise<void> {
    const name = isOn ? `${CONTROLS_LABEL} (${FILTERS_ON_TEXT})` : CONTROLS_LABEL;

    await expect(this.controlsButton).toHaveAccessibleName(name);
    await expect(this.filtersOn).toBeVisible({ visible: isOn });
    await expect(this.filtersOn.locator('span').first()).toHaveClass(codiconClassOf('filter'));
    await expect(this.page.locator('.has-filters')).toHaveCount(0);
  }

  private inputColors(): InputOptionColors {
    const colors = this.colors;

    if (colors === null) throw new Error('graph e2e: setInputOptionVars must run first');

    return colors;
  }

  private async expectGroup(group: ToolbarGroup): Promise<void> {
    const buttons = this.page.getByRole('group', { name: group.name, exact: true }).getByRole('button');

    await expect.poll(async () => buttons.evaluateAll(accessibleNamesOf)).toStrictEqual(group.buttons);
  }
}
