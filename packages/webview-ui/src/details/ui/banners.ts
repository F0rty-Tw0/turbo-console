import { codicon, textButton, textElement } from './page-elements.ts';
import type { RefreshMessage } from '../../bridge/common/details-message.type.ts';
import type { PackageDetails } from '../../bridge/common/details-state.type.ts';
import type { RenderContext } from '../common/details-page.type.ts';

type BannerTone = 'warning' | 'error';

/** Spec 1b §4.5: fixed text, never the error message; the details are in the output channel. */
const DRY_RUN_FAILED_TEXT = "Couldn't read the task details. See Output.";

const RELOAD_RETRY: RefreshMessage = { type: 'refresh', scope: 'root' };

const DRY_RUN_RETRY: RefreshMessage = { type: 'refresh', scope: 'dryRun' };

const banner = (tone: BannerTone, text: string, retry: RefreshMessage, context: RenderContext): HTMLElement => {
  const { bridge, focusTargets } = context;
  const element = textElement('div', `banner banner-${tone}`, '');
  const icon = codicon(tone);
  const message = textElement('span', 'banner-text', text);
  const retryButton = textButton('Retry', (): void => bridge.post(retry));
  const outputButton = textButton('Show Output', (): void => bridge.post({ type: 'showOutput' }));

  focusTargets.set(`retry-${retry.scope}`, retryButton);
  element.setAttribute('role', 'status');
  element.append(icon, message, retryButton, outputButton);

  return element;
};

/** The reload banner (`reloadError` is host-built fixed text) and the failed dry-run banner, in that order. */
export const banners = (state: PackageDetails, context: RenderContext): HTMLElement[] => {
  const shown: HTMLElement[] = [];

  if (state.reloadError !== null) shown.push(banner('warning', state.reloadError, RELOAD_RETRY, context));

  if (state.dryRun === 'failed') shown.push(banner('error', DRY_RUN_FAILED_TEXT, DRY_RUN_RETRY, context));

  return shown;
};
