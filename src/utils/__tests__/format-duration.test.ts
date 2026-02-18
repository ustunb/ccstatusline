import {
    describe,
    expect,
    it
} from 'vitest';

import { formatDurationMs } from '../jsonl';

describe('formatDurationMs', () => {
    it('should return "<1m" for durations less than 1 minute', () => {
        expect(formatDurationMs(0)).toBe('<1m');
        expect(formatDurationMs(30000)).toBe('<1m');
        expect(formatDurationMs(59999)).toBe('<1m');
    });

    it('should return minutes only for durations under 1 hour', () => {
        expect(formatDurationMs(60000)).toBe('1m');
        expect(formatDurationMs(300000)).toBe('5m');
        expect(formatDurationMs(3540000)).toBe('59m');
    });

    it('should return hours only when no remaining minutes', () => {
        expect(formatDurationMs(3600000)).toBe('1hr');
        expect(formatDurationMs(7200000)).toBe('2hr');
    });

    it('should return hours and minutes when both are present', () => {
        expect(formatDurationMs(3660000)).toBe('1hr 1m');
        expect(formatDurationMs(5400000)).toBe('1hr 30m');
        expect(formatDurationMs(9000000)).toBe('2hr 30m');
    });
});