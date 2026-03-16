// AnyLM: Models Single Source of Truth
// Used by completions handler, models endpoint, credits, and frontend

export const MODELS = {
    // : Free Models :
    'gpt-5.4': {
        id: 'gpt-5.4',
        name: 'GPT-5.4',
        provider: 'OpenAI',
        tier: 'free-limited',
        type: 'chat',
        description: 'Latest reasoning model. [BETA DISCOUNT] Handles complex multi-step problems.',
        literouter_id: 'gpt-4o',
        pricing: { input: 2.5, output: 10 }, // Beta discount from $5/$15
        rateLimit: 20,
    },
    'gemini-3.1-pro-preview': {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro',
        provider: 'Google',
        tier: 'free-limited',
        type: 'chat',
        description: 'Multimodal flagship. [BETA DISCOUNT] Massive context window.',
        literouter_id: 'google/gemini-2.0-pro-exp-02-05:free',
        pricing: { input: 1, output: 4 }, // Beta discount
        rateLimit: 20,
    },
    'gemini-3-flash': {
        id: 'gemini-3-flash',
        name: 'Gemini 3 Flash',
        provider: 'Google',
        tier: 'free-limited',
        type: 'chat',
        description: 'Fast and efficient. [BETA DISCOUNT] Perfect for speed.',
        literouter_id: 'google/gemini-2.0-flash-001',
        pricing: { input: 0.05, output: 0.2 }, // Beta discount
        rateLimit: 20,
    },
    'gemini-3.1-flash-lite-preview-thinking': {
        id: 'gemini-3.1-flash-lite-preview-thinking',
        name: 'Gemini 3.1 Flash Lite Thinking',
        provider: 'Google',
        tier: 'free',
        type: 'chat',
        literouter_id: 'gemini-3.1-flash-lite-preview-thinking',
        pricing: { input: 0, output: 0 },
        context_window: 1000000,
        isTrulyFree: true,
        isReasoning: true
    },
    'glm-5': {
        id: 'glm-5',
        name: 'GLM-5',
        provider: 'Zhipu AI',
        tier: 'free-limited',
        type: 'chat',
        description: 'Bilingual powerhouse. [BETA DISCOUNT] Strong reasoning.',
        literouter_id: 'glm-4-9b-chat',
        pricing: { input: 0.1, output: 0.1 }, // Beta discount
        rateLimit: 20,
    },
    'kimi-k2.5': {
        id: 'kimi-k2.5',
        name: 'Kimi K2.5',
        provider: 'Moonshot',
        tier: 'free',
        type: 'chat',
        description: 'Truly Free. Exceptional code performance.',
        literouter_id: 'kimi-k2.5',
        pricing: { input: 0, output: 0 },
        isTrulyFree: true,
        rateLimit: 20,
    },
    'deepseek-v3.2': {
        id: 'deepseek-v3.2',
        name: 'DeepSeek V3.2',
        provider: 'DeepSeek',
        tier: 'free-limited',
        type: 'chat',
        description: 'Strong coder. [BETA DISCOUNT] Unbeatable value.',
        literouter_id: 'deepseek/deepseek-chat',
        pricing: { input: 0.1, output: 0.2 }, // Beta discount
        rateLimit: 20,
    },
    'qwen3-coder': {
        id: 'qwen3-coder',
        name: 'Qwen3 Coder',
        provider: 'Alibaba',
        tier: 'free',
        type: 'chat',
        description: 'Truly Free. Exceptional coding performance.',
        literouter_id: 'qwen/qwen-2.5-coder-32b-instruct',
        pricing: { input: 0, output: 0 },
        isTrulyFree: true,
        rateLimit: 20,
    },
    'minimax-m2.5': {
        id: 'minimax-m2.5',
        name: 'MiniMax M2.5',
        provider: 'MiniMax',
        tier: 'free-limited',
        type: 'chat',
        description: 'API ONLY. Specialized text generation model.',
        literouter_id: 'minimax/minimax-text-01',
        pricing: { input: 0.15, output: 0.8 }, // Beta discount
        rateLimit: 40,
        isApiOnly: true,
    },
    'healer-alpha': {
        id: 'healer-alpha',
        name: 'Healer Alpha',
        provider: 'AnyLM',
        tier: 'free-limited',
        type: 'chat',
        description: 'Empathetic conversations. [BETA DISCOUNT]',
        literouter_id: 'healer-alpha-free:full-context',
        pricing: { input: 0.05, output: 0.05 }, // Beta discount
        rateLimit: 20,
    },
    'hunter-alpha': {
        id: 'hunter-alpha',
        name: 'Hunter Alpha',
        provider: 'AnyLM',
        tier: 'free-limited',
        type: 'chat',
        description: 'Research and search. [BETA DISCOUNT]',
        literouter_id: 'hunter-alpha-free:full-context',
        pricing: { input: 0.05, output: 0.05 }, // Beta discount
        rateLimit: 20,
    },

    // ── Plus Models ──
    'claude-haiku-4.5': {
        id: 'claude-haiku-4.5',
        name: 'Claude Haiku 4.5',
        provider: 'Anthropic',
        tier: 'plus',
        type: 'chat',
        description: 'Fast and affordable. [BETA DISCOUNT]',
        literouter_id: 'anthropic/claude-3-haiku-20240307',
        pricing: { input: 0.2, output: 1.0 }, // Beta discount
        rateLimit: 60,
    },
    'claude-sonnet-4.6': {
        id: 'claude-sonnet-4.6',
        name: 'Claude Sonnet 4.6',
        provider: 'Anthropic',
        tier: 'plus',
        type: 'chat',
        description: 'Intelligence meets speed. [BETA DISCOUNT]',
        literouter_id: 'anthropic/claude-3.5-sonnet-20241022',
        pricing: { input: 2.5, output: 12.5 }, // Beta discount
        rateLimit: 60,
    },
    'grok-4.1-fast-reasoning': {
        id: 'grok-4.1-fast-reasoning',
        name: 'Grok 4.1 Fast (Reasoning)',
        provider: 'xAI',
        tier: 'plus',
        type: 'chat',
        description: 'Fast and uncensored reasoning. [BETA DISCOUNT]',
        literouter_id: 'x-ai/grok-2-1212',
        pricing: { input: 1.5, output: 7.5 }, // Beta discount
        rateLimit: 60,
    },
    'grok-4.1-fast-non-reasoning': {
        id: 'grok-4.1-fast-non-reasoning',
        name: 'Grok 4.1 Fast',
        provider: 'xAI',
        tier: 'plus',
        type: 'chat',
        description: 'Fast and uncensored. [BETA DISCOUNT]',
        literouter_id: 'x-ai/grok-2-1212',
        pricing: { input: 1.5, output: 7.5 }, // Beta discount
        rateLimit: 60,
    },

    'grok-4.20-reasoning': {
        id: 'grok-4.20-reasoning',
        name: 'Grok 4.20 (Reasoning)',
        provider: 'xAI',
        tier: 'free-limited',
        type: 'chat',
        description: 'TEMPORARILY FREE. Latest advanced reasoning model from xAI.',
        literouter_id: 'x-ai/grok-2-reasoning',
        pricing: { input: 0, output: 0 },
        isApiOnly: true,
        isReasoning: true,
        tempFree: true
    },
    'grok-4.20-multi-agent-beta': {
        id: 'grok-4.20-multi-agent-beta',
        name: 'Grok 4.20 (Multi-Agent Beta)',
        provider: 'xAI',
        tier: 'pro',
        type: 'chat',
        description: 'BETA. Specialized multi-agent swarm for complex tasks.',
        literouter_id: 'grok-4.20-multi-agent-beta',
        pricing: { input: 10, output: 30 },
        isApiOnly: true,
        rateLimit: 10
    },
    // ── Pro Models ──
    'claude-opus-4.6': {
        id: 'claude-opus-4.6',
        name: 'Claude Opus 4.6',
        provider: 'Anthropic',
        tier: 'pro',
        type: 'chat',
        description: 'The ultimate reasoning model. [BETA DISCOUNT]',
        literouter_id: 'anthropic/claude-3-opus-20240229',
        pricing: { input: 12.5, output: 62.5 }, // Beta discount
        rateLimit: 200,
    },

    // ── Image Models (API only) ──
    'dreamshaper-v1': {
        id: 'dreamshaper-v1',
        name: 'DreamShaper V1',
        provider: 'AnyLM',
        tier: 'plus',
        type: 'image',
        description: 'High-quality image generation. [BETA DISCOUNT]',
        literouter_id: 'dreamshaper-v1',
        pricing: { per_image: 0.015 }, // Beta discount
        rateLimit: 60,
    },
    'p-image': {
        id: 'p-image',
        name: 'P-Image',
        provider: 'AnyLM',
        tier: 'plus',
        type: 'image',
        description: 'Fast image generation. [BETA DISCOUNT]',
        literouter_id: 'p-image',
        pricing: { per_image: 0.008 }, // Beta discount
        rateLimit: 60,
    },

    // ── Auto-feature Models (internal, not user-selectable) ──
    'gpt-4o-search-preview': {
        id: 'gpt-4o-search-preview',
        name: 'Web Search',
        provider: 'OpenAI',
        tier: 'internal',
        type: 'chat',
        description: 'Web search augmented model.',
        literouter_id: 'openai/gpt-4o-2024-05-13',
        pricing: { input: 0, output: 0 },
    },
    'tongyi-deepresearch-30b-a3b': {
        id: 'tongyi-deepresearch-30b-a3b',
        name: 'Deep Search',
        provider: 'Alibaba',
        tier: 'internal',
        type: 'chat',
        description: 'Advanced reasoning and search model.',
        literouter_id: 'tongyi-deepresearch-30b-a3b',
        pricing: { input: 0, output: 0 },
    },
    'command-a-vision-07-2025': {
        id: 'command-a-vision-07-2025',
        name: 'Vision',
        provider: 'Cohere',
        tier: 'internal',
        type: 'chat',
        description: 'Vision-capable model.',
        literouter_id: 'cohere/command-r-plus-08-2024',
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

// Daily usage limits per plan and model Tier
export const DAILY_LIMITS = {
    free: {
        'truly-free': 500,    // Gemini Lite, Kimi
        'free-limited': 20,    // GPT-5.4, Gemini Pro
        'plus': 0,
        'pro': 0
    },
    plus: {
        'truly-free': 5000,
        'free-limited': 100,
        'plus': 50,
        'pro': 0
    },
    pro: {
        'truly-free': 99999,
        'free-limited': 500,
        'plus': 200,
        'pro': 50
    },
    admin: {
        'truly-free': 99999,
        'free-limited': 99999,
        'plus': 99999,
        'pro': 99999
    }
};

export function getDailyLimit(plan, modelId) {
    const model = MODELS[modelId];
    if (!model) return 0;
    
    // Categorize models for limits
    let group = model.tier;
    if (model.isTrulyFree) group = 'truly-free';
    
    const planLimits = DAILY_LIMITS[plan] || DAILY_LIMITS.free;
    return planLimits[group] ?? 0;
}

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
    return Object.values(MODELS).filter(m => m.type === 'chat' && m.tier !== 'internal' && !m.isApiOnly);
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

export function isFreeModel(modelId, isApi = false) {
    const model = MODELS[modelId];
    if (!model) return false;
    // On /chat, all free/free-limited models are free.
    // On API, only specified models are free.
    if (!isApi) {
        return !!model.isTrulyFree || model.tier === 'free' || model.tier === 'free-limited';
    }
    // API Free Models
    const apiFree = ['qwen3-coder', 'glm-5', 'kimi-k2.5', 'grok-4.20-reasoning'];
    return apiFree.includes(modelId) || !!model.isTrulyFree;
}

export function getModelTier(modelId) {
    return MODELS[modelId]?.tier || null;
}

export function isValidModel(modelId) {
    return modelId in MODELS && MODELS[modelId].tier !== 'internal';
}
