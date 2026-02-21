import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    describe,
    expect,
    it
} from 'vitest';

import { getTokenMetrics } from '../jsonl';

function createMockTimestamps(timestamps: string[]): string {
    return timestamps.map(ts => JSON.stringify({
        timestamp: ts,
        message: {
            usage: {
                input_tokens: 100,
                output_tokens: 50
            }
        }
    })).join('\n');
}

function floorToHour(timestamp: Date): Date {
    const floored = new Date(timestamp);
    floored.setUTCMinutes(0, 0, 0);
    return floored;
}

function getAllTimestampsFromContent(content: string): Date[] {
    const timestamps: Date[] = [];
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    for (const line of lines) {
        try {
            const json = JSON.parse(line) as {
                timestamp?: string;
                isSidechain?: boolean;
                message?: { usage?: { input_tokens?: number; output_tokens?: number } };
            };

            const usage = json.message?.usage;
            if (!usage)
                continue;

            const hasInputTokens = typeof usage.input_tokens === 'number';
            const hasOutputTokens = typeof usage.output_tokens === 'number';
            if (!hasInputTokens || !hasOutputTokens)
                continue;

            if (json.isSidechain === true)
                continue;

            const timestamp = json.timestamp;
            if (typeof timestamp !== 'string')
                continue;

            const date = new Date(timestamp);
            if (!Number.isNaN(date.getTime()))
                timestamps.push(date);
        } catch {
            continue;
        }
    }

    return timestamps;
}

function findBlockStartTime(
    content: string,
    currentTime: Date,
    sessionDurationHours = 5
): Date | null {
    const sessionDurationMs = sessionDurationHours * 60 * 60 * 1000;
    const now = currentTime;

    const timestamps = getAllTimestampsFromContent(content);

    if (timestamps.length === 0)
        return null;

    timestamps.sort((a, b) => b.getTime() - a.getTime());

    const mostRecentTimestamp = timestamps[0];
    if (!mostRecentTimestamp)
        return null;

    const timeSinceLastActivity = now.getTime() - mostRecentTimestamp.getTime();
    if (timeSinceLastActivity > sessionDurationMs) {
        return null;
    }

    let continuousWorkStart = mostRecentTimestamp;
    for (let i = 1; i < timestamps.length; i++) {
        const currentTimestamp = timestamps[i];
        const previousTimestamp = timestamps[i - 1];

        if (!currentTimestamp || !previousTimestamp)
            continue;

        const gap = previousTimestamp.getTime() - currentTimestamp.getTime();

        if (gap >= sessionDurationMs) {
            break;
        }

        continuousWorkStart = currentTimestamp;
    }

    const blocks: { start: Date; end: Date }[] = [];
    const sortedTimestamps = timestamps.slice().sort((a, b) => a.getTime() - b.getTime());

    let currentBlockStart: Date | null = null;
    let currentBlockEnd: Date | null = null;

    for (const timestamp of sortedTimestamps) {
        if (timestamp.getTime() < continuousWorkStart.getTime())
            continue;

        if (!currentBlockStart || (currentBlockEnd && timestamp.getTime() > currentBlockEnd.getTime())) {
            currentBlockStart = floorToHour(timestamp);
            currentBlockEnd = new Date(currentBlockStart.getTime() + sessionDurationMs);
            blocks.push({ start: currentBlockStart, end: currentBlockEnd });
        }
    }

    for (const block of blocks) {
        if (now.getTime() >= block.start.getTime() && now.getTime() <= block.end.getTime()) {
            const hasActivity = timestamps.some(t => t.getTime() >= block.start.getTime()
                && t.getTime() <= block.end.getTime()
            );

            if (hasActivity) {
                return block.start;
            }
        }
    }

    return null;
}

describe('Block Detection Algorithm', () => {
    describe('Real scenario bug fix', () => {
        it('should correctly handle morning and evening blocks with gap', () => {
            const content = createMockTimestamps([
                '2025-09-23T09:42:18.000Z',
                '2025-09-23T12:52:31.000Z',
                '2025-09-23T15:44:16.000Z',
                '2025-09-23T16:57:24.000Z'
            ]);

            const currentTime = new Date('2025-09-23T18:10:00.000Z');
            const result = findBlockStartTime(content, currentTime);

            expect(result).not.toBeNull();
            expect(result?.toISOString()).toBe('2025-09-23T15:00:00.000Z');
        });
    });

    describe('Multiple messages in single block', () => {
        it('should create single block for messages within 5 hours', () => {
            const content = createMockTimestamps([
                '2025-09-23T08:15:00.000Z',
                '2025-09-23T08:45:00.000Z',
                '2025-09-23T09:30:00.000Z',
                '2025-09-23T10:00:00.000Z'
            ]);

            const currentTime = new Date('2025-09-23T11:30:00.000Z');
            const result = findBlockStartTime(content, currentTime);

            expect(result).not.toBeNull();
            expect(result?.toISOString()).toBe('2025-09-23T08:00:00.000Z');
        });
    });

    describe('Multiple blocks with gaps', () => {
        it('should correctly identify current block in multi-block scenario', () => {
            const content = createMockTimestamps([
                '2025-09-22T22:13:00.000Z',
                '2025-09-23T03:56:00.000Z',
                '2025-09-23T04:01:00.000Z',
                '2025-09-23T12:33:00.000Z',
                '2025-09-23T18:01:00.000Z'
            ]);

            const currentTime = new Date('2025-09-23T20:43:00.000Z');
            const result = findBlockStartTime(content, currentTime);

            expect(result).not.toBeNull();
            expect(result?.toISOString()).toBe('2025-09-23T18:00:00.000Z');
        });
    });

    describe('Edge cases', () => {
        it('should return null when current time is in gap between blocks', () => {
            const content = createMockTimestamps([
                '2025-09-23T08:00:00.000Z',
                '2025-09-23T10:00:00.000Z'
            ]);

            const currentTime = new Date('2025-09-23T14:00:00.000Z');
            const result = findBlockStartTime(content, currentTime);

            expect(result).toBeNull();
        });

        it('should return null when no messages within 5 hours', () => {
            const content = createMockTimestamps([
                '2025-09-23T08:00:00.000Z'
            ]);

            const currentTime = new Date('2025-09-23T14:00:00.000Z');
            const result = findBlockStartTime(content, currentTime);

            expect(result).toBeNull();
        });

        it('should handle block boundary correctly', () => {
            const content = createMockTimestamps([
                '2025-09-23T10:30:00.000Z'
            ]);

            const currentTime = new Date('2025-09-23T15:00:00.000Z');
            const result = findBlockStartTime(content, currentTime);

            expect(result).not.toBeNull();
            expect(result?.toISOString()).toBe('2025-09-23T10:00:00.000Z');
        });

        it('should detect 5+ hour gap as boundary', () => {
            const content = createMockTimestamps([
                '2025-09-23T08:00:00.000Z',
                '2025-09-23T13:01:00.000Z'
            ]);

            const currentTime = new Date('2025-09-23T15:00:00.000Z');
            const result = findBlockStartTime(content, currentTime);

            expect(result).not.toBeNull();
            expect(result?.toISOString()).toBe('2025-09-23T13:00:00.000Z');
        });

        it('should handle messages at exact hour boundaries', () => {
            const content = createMockTimestamps([
                '2025-09-23T10:00:00.000Z',
                '2025-09-23T12:00:00.000Z'
            ]);

            const currentTime = new Date('2025-09-23T13:30:00.000Z');
            const result = findBlockStartTime(content, currentTime);

            expect(result).not.toBeNull();
            expect(result?.toISOString()).toBe('2025-09-23T10:00:00.000Z');
        });
    });

    describe('Invalid inputs', () => {
        it('should return null for empty content', () => {
            const result = findBlockStartTime('', new Date());
            expect(result).toBeNull();
        });

        it('should return null for invalid JSON', () => {
            const result = findBlockStartTime('not json', new Date());
            expect(result).toBeNull();
        });
    });
});

describe('getTokenMetrics - systemOverhead', () => {
    function writeTempJsonl(lines: object[]): string {
        const tmpFile = path.join(os.tmpdir(), `ccstatusline-test-${Date.now()}.jsonl`);
        fs.writeFileSync(tmpFile, lines.map(l => JSON.stringify(l)).join('\n'));
        return tmpFile;
    }

    it('should compute systemOverhead from first main-chain entry', async () => {
        const tmpFile = writeTempJsonl([
            {
                timestamp: '2025-09-23T08:00:00.000Z',
                message: {
                    usage: {
                        input_tokens: 500,
                        output_tokens: 100,
                        cache_read_input_tokens: 25000,
                        cache_creation_input_tokens: 5000
                    }
                }
            },
            {
                timestamp: '2025-09-23T08:05:00.000Z',
                message: {
                    usage: {
                        input_tokens: 800,
                        output_tokens: 200,
                        cache_read_input_tokens: 30000,
                        cache_creation_input_tokens: 0
                    }
                }
            }
        ]);

        const metrics = await getTokenMetrics(tmpFile);
        // First entry: 500 + 25000 + 5000 = 30500
        expect(metrics.systemOverhead).toBe(30500);
        fs.unlinkSync(tmpFile);
    });

    it('should skip sidechain entries for systemOverhead', async () => {
        const tmpFile = writeTempJsonl([
            {
                timestamp: '2025-09-23T07:59:00.000Z',
                isSidechain: true,
                message: {
                    usage: {
                        input_tokens: 999,
                        output_tokens: 50,
                        cache_read_input_tokens: 0,
                        cache_creation_input_tokens: 0
                    }
                }
            },
            {
                timestamp: '2025-09-23T08:00:00.000Z',
                message: {
                    usage: {
                        input_tokens: 400,
                        output_tokens: 100,
                        cache_read_input_tokens: 20000,
                        cache_creation_input_tokens: 10000
                    }
                }
            }
        ]);

        const metrics = await getTokenMetrics(tmpFile);
        // Sidechain skipped; first main-chain: 400 + 20000 + 10000 = 30400
        expect(metrics.systemOverhead).toBe(30400);
        fs.unlinkSync(tmpFile);
    });

    it('should skip API error messages for systemOverhead', async () => {
        const tmpFile = writeTempJsonl([
            {
                timestamp: '2025-09-23T08:00:00.000Z',
                isApiErrorMessage: true,
                message: {
                    usage: {
                        input_tokens: 0,
                        output_tokens: 0
                    }
                }
            },
            {
                timestamp: '2025-09-23T08:01:00.000Z',
                message: {
                    usage: {
                        input_tokens: 300,
                        output_tokens: 100,
                        cache_read_input_tokens: 15000,
                        cache_creation_input_tokens: 15000
                    }
                }
            }
        ]);

        const metrics = await getTokenMetrics(tmpFile);
        // Error message skipped; first valid: 300 + 15000 + 15000 = 30300
        expect(metrics.systemOverhead).toBe(30300);
        fs.unlinkSync(tmpFile);
    });

    it('should return 0 systemOverhead for empty transcript', async () => {
        const tmpFile = writeTempJsonl([]);
        fs.writeFileSync(tmpFile, '');

        const metrics = await getTokenMetrics(tmpFile);
        expect(metrics.systemOverhead).toBe(0);
        fs.unlinkSync(tmpFile);
    });

    it('should return 0 systemOverhead for nonexistent file', async () => {
        const metrics = await getTokenMetrics('/tmp/nonexistent-file-12345.jsonl');
        expect(metrics.systemOverhead).toBe(0);
    });
});