// models.js — single source of truth for all model data
// Used by completions handler, models endpoint, credits, and frontend

export const MODELS = {
    // ── Free Models ──
    'gpt-5.4': {
        id: 'gpt-5.4',
        name: 'GPT-5.4',
        provider: 'OpenAI',
        tier: 'free-limited',
        type: 'chat',
        description: 'Latest reasoning model. Limited free usage via $2 starting credit.',
        literouter_id: 'gpt-5.4',
        pricing: { input: 1, output: 5 }, // per 1M tokens ($0.001 - $0.005)
    },
    'gemini-3.1-pro-preview': {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro',
        provider: 'Google',
        tier: 'free-limited',
        type: 'chat',
        description: 'Multimodal flagship. Limited free usage via $2 starting credit.',
        literouter_id: 'gemini-2.0-pro-exp-02-05',
        pricing: { input: 1.25, output: 5 },
    },
    'gemini-3-flash': {
        id: 'gemini-3-flash',
        name: 'Gemini 3 Flash',
        provider: 'Google',
        tier: 'free-limited',
        type: 'chat',
        description: 'Fast and efficient. Limited free usage via $2 starting credit.',
        literouter_id: 'gemini-3-flash',
        pricing: { input: 0.1, output: 0.4 },
    },
    'glm-5': {
        id: 'glm-5',
        name: 'GLM-5',
        provider: 'Zhipu AI',
        tier: 'free-limited',
        type: 'chat',
        description: 'Powerful bilingual model. Limited free usage via $2 starting credit.',
        literouter_id: 'glm-5',
        pricing: { input: 0.5, output: 2 },
    },
    'kimi-k2.5': {
        id: 'kimi-k2.5',
        name: 'Kimi K2.5',
        provider: 'Moonshot',
        tier: 'free',
        type: 'chat',
        description: 'Truly Free. Exceptional reasoning and code performance.',
        literouter_id: 'kimi-k2.5',
        pricing: { input: 0, output: 0 },
        isTrulyFree: true,
    },
    'deepseek-v3.2': {
        id: 'deepseek-v3.2',
        name: 'DeepSeek V3.2',
        provider: 'DeepSeek',
        tier: 'free-limited',
        type: 'chat',
        description: 'Strong coder. Limited free usage via $2 starting credit.',
        literouter_id: 'deepseek-v3',
        pricing: { input: 0.14, output: 0.28 },
    },
    'qwen3-coder': {
        id: 'qwen3-coder',
        name: 'Qwen3 Coder',
        provider: 'Alibaba',
        tier: 'free',
        type: 'chat',
        description: 'Truly Free. Exceptional coding performance with high limits.',
        literouter_id: 'qwen-2.5-coder-32b-instruct',
        pricing: { input: 0, output: 0 },
        isTrulyFree: true,
    },
    'healer-alpha': {
        id: 'healer-alpha',
        name: 'Healer Alpha',
        provider: 'AnyLM',
        tier: 'free-limited',
        type: 'chat',
        description: 'Empathetic conversations. Limited free usage via $2 starting credit.',
        literouter_id: 'healer-alpha-free:full-context',
        pricing: { input: 0.1, output: 0.1 },
    },
    'hunter-alpha': {
        id: 'hunter-alpha',
        name: 'Hunter Alpha',
        provider: 'AnyLM',
        tier: 'free-limited',
        type: 'chat',
        description: 'Research and search. Limited free usage via $2 starting credit.',
        literouter_id: 'hunter-alpha-free:full-context',
        pricing: { input: 0.1, output: 0.1 },
    },

    // ── Plus Models ──
    'claude-haiku-4.5': {
        id: 'claude-haiku-4.5',
        name: 'Claude Haiku 4.5',
        provider: 'Anthropic',
        tier: 'plus',
        type: 'chat',
        description: 'Fast and affordable Claude model for everyday tasks.',
        literouter_id: 'claude-haiku-4.5',
        pricing: { input: 0.25, output: 1.25 }, // per 1M tokens
    },
    'claude-sonnet-4.6': {
        id: 'claude-sonnet-4.6',
        name: 'Claude Sonnet 4.6',
        provider: 'Anthropic',
        tier: 'plus',
        type: 'chat',
        description: 'The perfect balance of intelligence and speed.',
        literouter_id: 'claude-sonnet-4.6',
        pricing: { input: 3, output: 15 },
    },
    'grok-4.1-fast-reasoning': {
        id: 'grok-4.1-fast-reasoning',
        name: 'Grok 4.1 Fast (Reasoning)',
        provider: 'xAI',
        tier: 'plus',
        type: 'chat',
        description: 'Fast and uncensored with advanced reasoning capabilities.',
        literouter_id: 'grok-4.1-fast',
        pricing: { input: 5, output: 25 },
    },
    'grok-4.1-fast-non-reasoning': {
        id: 'grok-4.1-fast-non-reasoning',
        name: 'Grok 4.1 Fast',
        provider: 'xAI',
        tier: 'plus',
        type: 'chat',
        description: 'Fast and uncensored without reasoning overhead.',
        literouter_id: 'grok-4.1-fast',
        pricing: { input: 5, output: 25 },
    },

    // ── Pro Models ──
    'claude-opus-4.6': {
        id: 'claude-opus-4.6',
        name: 'Claude Opus 4.6',
        provider: 'Anthropic',
        tier: 'pro',
        type: 'chat',
        description: 'The most intelligent model available for complex reasoning and highly difficult tasks.',
        literouter_id: 'claude-opus-4.6',
        pricing: { input: 15, output: 75 },
    },

    // ── Image Models (API only) ──
    'dreamshaper-v1': {
        id: 'dreamshaper-v1',
        name: 'DreamShaper V1',
        provider: 'AnyLM',
        tier: 'plus',
        type: 'image',
        description: 'High-quality image generation model.',
        literouter_id: 'dreamshaper-v1',
        pricing: { per_image: 0.02 },
    },
    'p-image': {
        id: 'p-image',
        name: 'P-Image',
        provider: 'AnyLM',
        tier: 'plus',
        type: 'image',
        description: 'Fast image generation model.',
        literouter_id: 'p-image',
        pricing: { per_image: 0.01 },
    },

    // ── Auto-feature Models (internal, not user-selectable) ──
    'gpt-4o-search-preview': {
        id: 'gpt-4o-search-preview',
        name: 'Web Search',
        provider: 'OpenAI',
        tier: 'internal',
        type: 'chat',
        description: 'Web search augmented model.',
        literouter_id: 'gpt-4o-search-preview',
        pricing: { input: 0, output: 0 },
    },
    'command-a-vision-07-2025': {
        id: 'command-a-vision-07-2025',
        name: 'Vision',
        provider: 'Cohere',
        tier: 'internal',
        type: 'chat',
        description: 'Vision-capable model for image understanding.',
        literouter_id: 'command-a-vision-07-2025',
        pricing: { input: 0, output: 0 },
    },
};

// Rate limits per tier (requests per minute)
export const RATE_LIMITS = {
    free: 20,
    'free-limited': 10,
    plus: 60,
    pro: 200,
    admin: 999999,
};

// Plan pricing
export const PLANS = {
    free: { price: 0, name: 'Free', credit_allowance: 2 },
    plus: { price: 5, name: 'Plus', credit_allowance: 20 },
    pro: { price: 20, name: 'Pro', credit_allowance: 100 },
};

// Helper functions
export function getModelsByTier(tier) {
    return Object.values(MODELS).filter(m => m.tier === tier);
}

export function getChatModels() {
    return Object.values(MODELS).filter(m => m.type === 'chat' && m.tier !== 'internal');
}

export function getImageModels() {
    return Object.values(MODELS).filter(m => m.type === 'image');
}

export function getAllowedModels(plan) {
    const tierRank = { free: 0, 'free-limited': 0, plus: 1, pro: 2, admin: 99 };
    const rank = tierRank[plan] ?? 0;
    return Object.values(MODELS).filter(m => {
        if (m.tier === 'internal') return false;
        return (tierRank[m.tier] ?? 0) <= rank;
    });
}

export function getAllowedModelIds(plan) {
    return getAllowedModels(plan).map(m => m.id);
}

export function resolveModel(modelId) {
    const model = MODELS[modelId];
    return model ? model.literouter_id : modelId;
}

export function isFreeModel(modelId) {
    const model = MODELS[modelId];
    if (!model) return false;
    return !!model.isTrulyFree;
}

export function getModelTier(modelId) {
    return MODELS[modelId]?.tier || null;
}

export function isValidModel(modelId) {
    return modelId in MODELS && MODELS[modelId].tier !== 'internal';
}
