import type { GraphAffected } from '../../bridge/common/graph-affected.type.ts';
import type { LegendRender } from '../common/legend.type.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import { affectedUpdateOf } from '../utils/affected-record.util.ts';
import { isGraphHostMessage } from '../utils/graph-host-message.util.ts';

/**
 * Keeps the legend's affected rows in step with the host: they show only while the last graph state said `affectedShown` and the
 * last `runs` message that carried a well-formed `affected` held an object, worded for its level. Nothing renders before the
 * first theme, which brings the colours, and nothing renders again while the colours object and the shown level are the
 * ones last rendered.
 */
export class GraphLegend {
  private readonly render: LegendRender;
  private isShown = false;
  private level: GraphAffected['mode'] | null = null;
  private colors: ThemeColors | null = null;
  private drawnColors: ThemeColors | null = null;
  private drawnLevel: GraphAffected['mode'] | null = null;

  public constructor(render: LegendRender) {
    this.render = render;
  }

  public themed(colors: ThemeColors): void {
    this.colors = colors;
    this.draw();
  }

  public received(message: unknown): void {
    if (!isGraphHostMessage(message)) return;

    if (message.type === 'state' && message.state.kind === 'graph') {
      this.isShown = message.state.affectedShown;
      this.draw();

      return;
    }

    if (message.type !== 'runs') return;

    const update = affectedUpdateOf(message.affected);

    if (update === undefined) return;

    this.level = update === null ? null : update.mode;
    this.draw();
  }

  private draw(): void {
    if (this.colors === null) return;

    const affected = this.isShown ? this.level : null;
    const isDrawn = this.colors === this.drawnColors && affected === this.drawnLevel;

    if (isDrawn) return;

    this.drawnColors = this.colors;
    this.drawnLevel = affected;
    this.render(this.colors, affected);
  }
}
