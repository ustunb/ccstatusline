import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';
import { formatTokens } from '../utils/renderer';

export class ContextLengthWidget implements Widget {
    getDefaultColor(): string { return 'brightBlack'; }
    getDescription(): string { return 'Shows the current context window size in tokens'; }
    getDisplayName(): string { return 'Context Length'; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        if (context.isPreview) {
            return item.rawValue ? '18.6k' : 'Ctx: 18.6k';
        }

        // Prefer context_window data from Claude Code (v2.0.65+)
        if (context.contextWindow && context.contextWindow.contextWindowSize > 0) {
            const tokens = context.contextWindow.totalInputTokens;
            return item.rawValue ? formatTokens(tokens) : `Ctx: ${formatTokens(tokens)}`;
        }

        // Fall back to transcript-based metrics
        if (context.tokenMetrics) {
            return item.rawValue ? formatTokens(context.tokenMetrics.contextLength) : `Ctx: ${formatTokens(context.tokenMetrics.contextLength)}`;
        }

        return null;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}