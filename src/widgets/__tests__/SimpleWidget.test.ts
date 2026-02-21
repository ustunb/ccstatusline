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
import { createSimpleWidget } from '../SimpleWidget';

const testWidget = createSimpleWidget({
    name: 'Test Widget',
    description: 'A test widget',
    label: 'Tst:',
    previewValue: '42k',
    defaultColor: 'cyan',
    getValue: ctx => ctx.tokenMetrics?.contextLength ?? null
});

function makeItem(rawValue = false): WidgetItem {
    return { id: 'test', type: 'test', rawValue };
}

describe('createSimpleWidget', () => {
    it('should return a valid Widget with correct metadata', () => {
        expect(testWidget.getDefaultColor()).toBe('cyan');
        expect(testWidget.getDisplayName()).toBe('Test Widget');
        expect(testWidget.getDescription()).toBe('A test widget');
        expect(testWidget.supportsRawValue()).toBe(true);
        expect(testWidget.supportsColors(makeItem())).toBe(true);
    });

    it('should return preview value in preview mode', () => {
        const context: RenderContext = { isPreview: true };
        expect(testWidget.render(makeItem(), context, DEFAULT_SETTINGS)).toBe('Tst:42k');
    });

    it('should return raw preview value when rawValue is true', () => {
        const context: RenderContext = { isPreview: true };
        expect(testWidget.render(makeItem(true), context, DEFAULT_SETTINGS)).toBe('42k');
    });

    it('should return null when getValue returns null', () => {
        const context: RenderContext = {};
        expect(testWidget.render(makeItem(), context, DEFAULT_SETTINGS)).toBeNull();
    });

    it('should format and label the value when data is present', () => {
        const context: RenderContext = {
            tokenMetrics: {
                inputTokens: 0,
                outputTokens: 0,
                cachedTokens: 0,
                totalTokens: 0,
                contextLength: 150000,
                systemOverhead: 30000
            }
        };
        expect(testWidget.render(makeItem(), context, DEFAULT_SETTINGS)).toBe('Tst:150.0k');
    });

    it('should return raw formatted value when rawValue is true', () => {
        const context: RenderContext = {
            tokenMetrics: {
                inputTokens: 0,
                outputTokens: 0,
                cachedTokens: 0,
                totalTokens: 0,
                contextLength: 150000,
                systemOverhead: 30000
            }
        };
        expect(testWidget.render(makeItem(true), context, DEFAULT_SETTINGS)).toBe('150.0k');
    });
});

describe('call-input widget (from context_window.current_usage)', () => {
    const callInputWidget = createSimpleWidget({
        name: 'Call Input',
        description: 'Last API call input tokens',
        label: 'CIn:',
        previewValue: '500',
        defaultColor: 'blue',
        getValue: ctx => ctx.data?.context_window?.current_usage?.input_tokens ?? null
    });

    it('should return null when context_window is absent', () => {
        const context: RenderContext = { data: {} };
        expect(callInputWidget.render(makeItem(), context, DEFAULT_SETTINGS)).toBeNull();
    });

    it('should return null when current_usage is absent', () => {
        const context: RenderContext = { data: { context_window: {} } };
        expect(callInputWidget.render(makeItem(), context, DEFAULT_SETTINGS)).toBeNull();
    });

    it('should render input tokens from current_usage', () => {
        const context: RenderContext = {
            data: {
                context_window: {
                    current_usage: {
                        input_tokens: 500,
                        cache_read_input_tokens: 80000,
                        cache_creation_input_tokens: 5000
                    }
                }
            }
        };
        expect(callInputWidget.render(makeItem(), context, DEFAULT_SETTINGS)).toBe('CIn:500');
    });
});

describe('conversation-content widget (derived)', () => {
    const convWidget = createSimpleWidget({
        name: 'Conversation Content',
        description: 'Context minus system overhead',
        label: 'Conv:',
        previewValue: '131k',
        defaultColor: 'magenta',
        getValue: (ctx) => {
            const t = ctx.tokenMetrics;
            return t ? Math.max(0, t.contextLength - t.systemOverhead) : null;
        }
    });

    it('should return null when tokenMetrics is absent', () => {
        const context: RenderContext = {};
        expect(convWidget.render(makeItem(), context, DEFAULT_SETTINGS)).toBeNull();
    });

    it('should compute context minus system overhead', () => {
        const context: RenderContext = {
            tokenMetrics: {
                inputTokens: 0,
                outputTokens: 0,
                cachedTokens: 0,
                totalTokens: 0,
                contextLength: 161000,
                systemOverhead: 30000
            }
        };
        expect(convWidget.render(makeItem(), context, DEFAULT_SETTINGS)).toBe('Conv:131.0k');
    });

    it('should clamp to zero when system overhead exceeds context', () => {
        const context: RenderContext = {
            tokenMetrics: {
                inputTokens: 0,
                outputTokens: 0,
                cachedTokens: 0,
                totalTokens: 0,
                contextLength: 10000,
                systemOverhead: 30000
            }
        };
        expect(convWidget.render(makeItem(), context, DEFAULT_SETTINGS)).toBe('Conv:0');
    });
});