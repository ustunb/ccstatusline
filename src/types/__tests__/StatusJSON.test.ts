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
    });
});
