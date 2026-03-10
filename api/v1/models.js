// models list endpoint
const MODELS = [
    { id: 'gpt-5.4', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'free' },
    { id: 'gemini-3.1-pro-preview', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'free' },
    { id: 'glm-5', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'free' },
    { id: 'kimi-k2.5', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'free' },
    { id: 'deepseek-v3.2', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'free' },
    { id: 'qwen3-coder', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'free' },
    { id: 'claude-haiku-4.5', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'plus' },
    { id: 'claude-sonnet-4.6', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'plus' },
    { id: 'grok-4.1-fast-reasoning', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'plus' },
    { id: 'grok-4.1-fast-non-reasoning', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'plus' },
    { id: 'opus', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat', plan: 'pro' }
];

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({
        object: 'list',
        data: MODELS
    });
};
