// models endpoint - shows what you can use around here 📋

const MODELS = [
    {
        id: 'gpt-5.4',
        object: 'model',
        created: 1700000000,
        owned_by: 'anymousxe',
        permission: [],
        root: 'gpt-5.4',
        parent: null
    },
    {
        id: 'gemini-3.1-pro-preview',
        object: 'model',
        created: 1700000000,
        owned_by: 'anymousxe',
        permission: [],
        root: 'gemini-3.1-pro-preview',
        parent: null
    },
    {
        id: 'glm-5',
        object: 'model',
        created: 1700000000,
        owned_by: 'anymousxe',
        permission: [],
        root: 'glm-5',
        parent: null
    }
];

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');

    // no auth needed for models list - its public info
    return res.status(200).json({
        object: 'list',
        data: MODELS
    });
};
