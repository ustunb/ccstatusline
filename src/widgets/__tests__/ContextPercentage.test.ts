import {
    describe,
    expect,
    it
} from 'vitest';

import type {
    RenderContext,
    WidgetItem
} from '../../types';
import { DEFAULT_SETTINGS } from '../../types/Settings';
import { ContextPercentageWidget } from '../ContextPercentage';

function render(modelId: string | undefined, contextLength: number, rawValue = false, inverse = false) {
    const widget = new ContextPercentageWidget();
    const context: RenderContext = {
        data: modelId ? { model: { id: modelId } } : undefined,
        tokenMetrics: {
            inputTokens: 0,
            outputTokens: 0,
            cachedTokens: 0,
            totalTokens: 0,
            contextLength
        }
    };
    const item: WidgetItem = {
        id: 'context-percentage',
        type: 'context-percentage',
        rawValue,
        metadata: inverse ? { inverse: 'true' } : undefined
    };

    return widget.render(item, context, DEFAULT_SETTINGS);
}

describe('ContextPercentageWidget', () => {
    describe('Sonnet 4.5 with 1M context window', () => {
        it('should calculate percentage using 1M denominator for Sonnet 4.5 with [1m] suffix', () => {
            const result = render('claude-sonnet-4-5-20250929[1m]', 42000);
            expect(result).toBe('Ctx: 4.2%');
        });

        it('should calculate percentage using 1M denominator for Sonnet 4.5 (raw value) with [1m] suffix', () => {
            const result = render('claude-sonnet-4-5-20250929[1m]', 42000, true);
            expect(result).toBe('4.2%');
        });
    });

    describe('with context_window data (Claude Code v2.0.65+)', () => {
        it('should use context_window data when available', () => {
            const widget = new ContextPercentageWidget();
            const item: WidgetItem = { id: '1', type: 'context-percentage' };
            const context: RenderContext = {
                data: { model: { id: 'claude-sonnet-4-6' } },
                tokenMetrics: { inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0, contextLength: 50000 },
                contextWindow: { totalInputTokens: 100000, totalOutputTokens: 5000, contextWindowSize: 200000 }
            };
            const result = widget.render(item, context, DEFAULT_SETTINGS);
            expect(result).toBe('Ctx: 50.0%'); // 100000/200000
        });

        it('should use context_window_size as denominator even with [1m] model', () => {
            const widget = new ContextPercentageWidget();
            const item: WidgetItem = { id: '1', type: 'context-percentage' };
            const context: RenderContext = {
                data: { model: { id: 'claude-sonnet-4-6[1m]' } },
                tokenMetrics: { inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0, contextLength: 100000 },
                contextWindow: { totalInputTokens: 100000, totalOutputTokens: 5000, contextWindowSize: 1000000 }
            };
            const result = widget.render(item, context, DEFAULT_SETTINGS);
            expect(result).toBe('Ctx: 10.0%'); // 100000/1000000
        });

        it('should fall back to tokenMetrics when context_window is absent', () => {
            const widget = new ContextPercentageWidget();
            const item: WidgetItem = { id: '1', type: 'context-percentage' };
            const context: RenderContext = {
                data: { model: { id: 'claude-sonnet-4-6' } },
                tokenMetrics: { inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0, contextLength: 50000 }
            };
            const result = widget.render(item, context, DEFAULT_SETTINGS);
            expect(result).toBe('Ctx: 25.0%'); // 50000/200000
        });
    });

    describe('Older models with 200k context window', () => {
        it('should calculate percentage using 200k denominator for older Sonnet 3.5', () => {
            const result = render('claude-3-5-sonnet-20241022', 42000);
            expect(result).toBe('Ctx: 21.0%');
        });

        it('should calculate percentage using 200k denominator when model ID is undefined', () => {
            const result = render(undefined, 42000);
            expect(result).toBe('Ctx: 21.0%');
        });

        it('should calculate percentage using 200k denominator for unknown model', () => {
            const result = render('claude-unknown-model', 42000);
            expect(result).toBe('Ctx: 21.0%');
        });
    });
});