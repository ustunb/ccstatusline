import type { Settings } from '../types/Settings';
import type {
    Widget,
    WidgetItemType
} from '../types/Widget';
import * as widgets from '../widgets';
import { createSimpleWidget } from '../widgets/SimpleWidget';

// Create widget registry
const widgetRegistry = new Map<WidgetItemType, Widget>([
    ['model', new widgets.ModelWidget()],
    ['output-style', new widgets.OutputStyleWidget()],
    ['git-branch', new widgets.GitBranchWidget()],
    ['git-changes', new widgets.GitChangesWidget()],
    ['git-worktree', new widgets.GitWorktreeWidget()],
    ['current-working-dir', new widgets.CurrentWorkingDirWidget()],
    ['tokens-input', new widgets.TokensInputWidget()],
    ['tokens-output', new widgets.TokensOutputWidget()],
    ['tokens-cached', new widgets.TokensCachedWidget()],
    ['tokens-total', new widgets.TokensTotalWidget()],
    ['context-length', new widgets.ContextLengthWidget()],
    ['context-percentage', new widgets.ContextPercentageWidget()],
    ['context-percentage-usable', new widgets.ContextPercentageUsableWidget()],
    ['session-clock', new widgets.SessionClockWidget()],
    ['session-cost', new widgets.SessionCostWidget()],
    ['block-timer', new widgets.BlockTimerWidget()],
    ['terminal-width', new widgets.TerminalWidthWidget()],
    ['version', new widgets.VersionWidget()],
    ['custom-text', new widgets.CustomTextWidget()],
    ['custom-command', new widgets.CustomCommandWidget()],
    ['claude-session-id', new widgets.ClaudeSessionIdWidget()],
    // Last-API-call widgets (from context_window.current_usage in stdin JSON)
    ['call-input', createSimpleWidget({
        name: 'Call Input',
        description: 'Last API call\'s non-cached input tokens',
        label: 'CIn:',
        previewValue: '500',
        defaultColor: 'blue',
        getValue: ctx => ctx.data?.context_window?.current_usage?.input_tokens ?? null
    })],
    ['call-output', createSimpleWidget({
        name: 'Call Output',
        description: 'Last API call\'s output tokens',
        label: 'COut:',
        previewValue: '1.2k',
        defaultColor: 'green',
        getValue: ctx => ctx.data?.context_window?.current_usage?.output_tokens ?? null
    })],
    ['call-cache-read', createSimpleWidget({
        name: 'Call Cache Read',
        description: 'Last API call\'s cache read tokens',
        label: 'CCR:',
        previewValue: '80k',
        defaultColor: 'cyan',
        getValue: ctx => ctx.data?.context_window?.current_usage?.cache_read_input_tokens ?? null
    })],
    ['call-cache-write', createSimpleWidget({
        name: 'Call Cache Write',
        description: 'Last API call\'s cache write tokens',
        label: 'CCW:',
        previewValue: '5k',
        defaultColor: 'yellow',
        getValue: ctx => ctx.data?.context_window?.current_usage?.cache_creation_input_tokens ?? null
    })],
    // Derived/computed widgets (from transcript JSONL)
    ['context-tokens', createSimpleWidget({
        name: 'Context Tokens',
        description: 'Absolute context size in tokens (from transcript)',
        label: 'Ctx:',
        previewValue: '161k',
        defaultColor: 'blue',
        getValue: ctx => ctx.tokenMetrics?.contextLength ?? null
    })],
    ['system-overhead', createSimpleWidget({
        name: 'System Overhead',
        description: 'System prompt + CLAUDE.md + tool definitions (approximate)',
        label: 'Sys:',
        previewValue: '30k',
        defaultColor: 'gray',
        getValue: ctx => ctx.tokenMetrics?.systemOverhead ?? null
    })],
    ['conversation-content', createSimpleWidget({
        name: 'Conversation Content',
        description: 'Context added since session start (context minus system overhead)',
        label: 'Conv:',
        previewValue: '131k',
        defaultColor: 'magenta',
        getValue: (ctx) => {
            const t = ctx.tokenMetrics;
            return t ? Math.max(0, t.contextLength - t.systemOverhead) : null;
        }
    })]
]);

export function getWidget(type: WidgetItemType): Widget | null {
    return widgetRegistry.get(type) ?? null;
}

export function getAllWidgetTypes(settings: Settings): WidgetItemType[] {
    const allTypes = Array.from(widgetRegistry.keys());

    // Add separator types based on settings
    if (!settings.powerline.enabled) {
        if (!settings.defaultSeparator) {
            allTypes.push('separator');
        }
        allTypes.push('flex-separator');
    }

    return allTypes;
}

export function isKnownWidgetType(type: string): boolean {
    return widgetRegistry.has(type)
        || type === 'separator'
        || type === 'flex-separator';
}