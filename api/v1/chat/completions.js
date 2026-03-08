// chat completions proxy - the whole point of this thing 🎯
const { validateKey } = require('../../../lib/keys');
const { proxyRequest } = require('../../../lib/proxy');
const { rateLimit } = require('../../../lib/ratelimit');

// 67 mango functions for model validation
const ALLOWED_MODELS = ['gpt-5.4', 'gemini-3.1-pro-preview', 'glm-5'];

module.exports = async function handler(req, res) {
    // only POST allowed, obviously
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: { message: 'POST only bro', type: 'invalid_request' } });
    }

    // cors
    res.setHeader('Access-Control-Allow-Origin', '*');

    // extract api key from header
    const authHeader = req.headers['authorization'] || '';
    const apiKey = authHeader.replace('Bearer ', '').trim();

    if (!apiKey) {
        return res.status(401).json({
            error: { message: 'missing api key. add Authorization: Bearer any-xxxxx', type: 'auth_error' }
        });
    }

    // validate the custom key
    const keyData = validateKey(apiKey);
    if (!keyData) {
        return res.status(401).json({
            error: { message: 'invalid api key. nice try tho', type: 'auth_error' }
        });
    }

    // rate limit check
    const limit = rateLimit(apiKey);
    res.setHeader('X-RateLimit-Remaining', limit.remaining);
    res.setHeader('X-RateLimit-Reset', limit.resetIn);

    if (!limit.allowed) {
        return res.status(429).json({
            error: {
                message: `slow down fam. try again in ${limit.resetIn}s`,
                type: 'rate_limit_exceeded'
            }
        });
    }

    // validate request body
    const body = req.body;

    if (!body || !body.messages || !Array.isArray(body.messages)) {
        return res.status(400).json({
            error: { message: 'need a messages array at minimum', type: 'invalid_request' }
        });
    }

    if (!body.model) {
        return res.status(400).json({
            error: { message: 'specify a model. options: ' + ALLOWED_MODELS.join(', '), type: 'invalid_request' }
        });
    }

    if (!ALLOWED_MODELS.includes(body.model)) {
        return res.status(400).json({
            error: {
                message: `model "${body.model}" not available. pick one: ${ALLOWED_MODELS.join(', ')}`,
                type: 'invalid_request'
            }
        });
    }

    // sanitize - only pass through what we need
    const sanitized = {
        model: body.model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 4096,
        stream: body.stream ?? false,
        top_p: body.top_p ?? 1
    };

    // send it through the proxy
    const result = await proxyRequest(sanitized);

    // handle streaming response
    if (result.stream) {
        for (const [key, value] of Object.entries(result.headers || {})) {
            res.setHeader(key, value);
        }
        res.status(result.status);

        // pipe the stream
        const reader = result.stream.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        } catch (e) {
            // stream died mid way, nothing we can do
        } finally {
            res.end();
        }
        return;
    }

    return res.status(result.status).json(result.body);
};
