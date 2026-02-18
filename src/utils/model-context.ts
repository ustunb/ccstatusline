interface ModelContextConfig {
    maxTokens: number;
    usableTokens: number;
}

export function getContextConfig(modelId?: string): ModelContextConfig {
    // Default to 200k for older models
    const defaultConfig = {
        maxTokens: 200000,
        usableTokens: 160000
    };

    if (!modelId)
        return defaultConfig;

    // Any model with the [1m] suffix has a 1M context window (long context beta)
    if (modelId.toLowerCase().includes('[1m]')) {
        return {
            maxTokens: 1000000,
            usableTokens: 800000 // 80% of 1M
        };
    }

    return defaultConfig;
}
