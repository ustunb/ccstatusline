import {
    describe,
    expect,
    it
} from 'vitest';

import { StatusJSONSchema } from '../StatusJSON';

describe('StatusJSONSchema', () => {
    describe('context_window', () => {
        it('should preserve unknown fields for forward compatibility', () => {
            const input = {
                context_window: {
                    total_input_tokens: 100,
                    context_window_size: 200000,
                    some_future_field: 42
                }
            };
            const result = StatusJSONSchema.parse(input);
            expect((result.context_window as Record<string, unknown>).some_future_field).toBe(42);
        });

        it('should parse current_usage fields', () => {
            const input = {
                context_window: {
                    total_input_tokens: 27297,
                    context_window_size: 1000000,
                    current_usage: {
                        input_tokens: 10,
                        cache_creation_input_tokens: 659,
                        cache_read_input_tokens: 88216
                    }
                }
            };
            const result = StatusJSONSchema.parse(input);
            expect(result.context_window?.current_usage?.input_tokens).toBe(10);
            expect(result.context_window?.current_usage?.cache_creation_input_tokens).toBe(659);
            expect(result.context_window?.current_usage?.cache_read_input_tokens).toBe(88216);
        });

        it('should be valid without current_usage', () => {
            const input = {
                context_window: {
                    total_input_tokens: 30000,
                    context_window_size: 200000
                }
            };
            const result = StatusJSONSchema.parse(input);
            expect(result.context_window?.current_usage).toBeUndefined();
            expect(result.context_window?.total_input_tokens).toBe(30000);
        });
    });
});