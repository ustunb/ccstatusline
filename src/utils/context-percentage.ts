import type { RenderContext } from '../types';

import { getContextConfig } from './model-context';

/**
 * Calculate context window usage percentage based on model's max tokens
 */
export function calculateContextPercentage(context: RenderContext): number {
    // Prefer context_window data from Claude Code (v2.0.65+)
    if (context.contextWindow && context.contextWindow.contextWindowSize > 0) {
        return Math.min(100, (context.contextWindow.totalInputTokens / context.contextWindow.contextWindowSize) * 100);
    }

    // Fall back to transcript-based metrics with model lookup
    if (!context.tokenMetrics) {
        return 0;
    }

    const model = context.data?.model;
    const modelId = typeof model === 'string' ? model : model?.id;
    const contextConfig = getContextConfig(modelId);

    return Math.min(100, (context.tokenMetrics.contextLength / contextConfig.maxTokens) * 100);
}