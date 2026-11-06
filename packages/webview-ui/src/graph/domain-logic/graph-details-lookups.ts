import { updateExplain } from './graph-details-render.ts';
import { wireExplain } from './graph-details-wire.ts';
import type { GraphEdgeExplainedMessage } from '../../bridge/common/graph-message.type.ts';
import type { ExplainState } from '../common/details.type.ts';
import type { DetailsEnv, DetailsView, GraphDetailsDeps, ShownExplain, ShownInspection } from '../common/graph-details.type.ts';
import type { LinkInspection } from '../common/inspection.type.ts';
import { explainPlanOf, explainStateOf, isReplyFor } from '../utils/explain-state.util.ts';

/**
 * The shown link's look-ups: asks the host for its manifest entry when a link view is built or a same-hash state arrives,
 * and applies the reply for the shown link to the view's explain block, in place or rebuilt.
 */
export class LinkLookups {
  private readonly deps: GraphDetailsDeps;
  private readonly env: () => DetailsEnv;
  private explain: ShownExplain | null = null;

  public constructor(deps: GraphDetailsDeps, env: () => DetailsEnv) {
    this.deps = deps;
    this.env = env;
  }

  /** A view was built for `inspection`: its explain block starts empty, and a link is asked about. */
  public built(inspection: ShownInspection): void {
    this.explain = null;

    if (inspection.kind === 'link') this.asked(inspection);
  }

  /** A same-hash state asks the host again about the shown link. */
  public reasked(link: LinkInspection): void {
    this.asked(link);
  }

  /** A reply for the shown link updates the explain block in place, or builds it again when its shape changed. */
  public explained(message: GraphEdgeExplainedMessage, view: DetailsView | null): void {
    const env = this.env();
    const shown = env.shown();
    const isReply = isReplyFor(message, shown);

    if (!isReply || view?.kind !== 'link') return;

    const state = explainStateOf(message.result, message.target);
    const isUpdated = this.updatedExplain(state);

    if (isUpdated) return;

    const hadFocus = view.explain.contains(document.activeElement);
    const details = this.deps.views.explain(state);

    view.explain.replaceChildren(details.root);
    this.explain = { state, details };
    wireExplain(details, message.source, (): ExplainState | null => this.explain?.state ?? null, env);

    if (hadFocus) view.heading.focus();
  }

  private asked(link: LinkInspection): void {
    this.deps.onExplain(link.source, link.target);
  }

  private updatedExplain(state: ExplainState): boolean {
    const { explain } = this;

    if (explain === null) return false;

    const plan = explainPlanOf(explain.state, state);

    if (plan === 'rebuild') return false;

    updateExplain(explain.details, state);
    this.explain = { state, details: explain.details };

    return true;
  }
}
