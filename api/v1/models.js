// models list endpoint
const MODELS = [
    { id: 'gpt-5.4', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat' },
    { id: 'gemini-3.1-pro-preview', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat' },
    { id: 'glm-5', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat' },
    { id: 'kimi-k2.5', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat' },
    { id: 'deepseek-v3.2', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'chat' },
    { id: 'flux.1-schnell', object: 'model', created: 1700000000, owned_by: 'anymousxe', type: 'image' }
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
