// image generation endpoint - requires image permission on key
const { validateKey, hasImagePermission } = require('../../../lib/keys');
const { proxyImageRequest } = require('../../../lib/proxy');
const { rateLimit } = require('../../../lib/ratelimit');

const ALLOWED_IMAGE_MODELS = ['flux.1-schnell'];

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: { message: 'POST only', type: 'invalid_request' } });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');

    const authHeader = req.headers['authorization'] || '';
    const apiKey = authHeader.replace('Bearer ', '').trim();

    if (!apiKey) {
        return res.status(401).json({
            error: { message: 'missing api key', type: 'auth_error' }
        });
    }

    const keyData = validateKey(apiKey);
    if (!keyData) {
        return res.status(401).json({
            error: { message: 'invalid api key', type: 'auth_error' }
        });
    }

    // check image permission
    if (!hasImagePermission(keyData)) {
        return res.status(403).json({
            error: {
                message: 'your api key does not have image generation permissions. contact an admin to request access',
                type: 'permission_denied'
            }
        });
    }

    const limit = rateLimit(apiKey);
    res.setHeader('X-RateLimit-Remaining', limit.remaining);
    res.setHeader('X-RateLimit-Reset', limit.resetIn);

    if (!limit.allowed) {
        return res.status(429).json({
            error: {
                message: `rate limited. try again in ${limit.resetIn}s`,
                type: 'rate_limit_exceeded'
            }
        });
    }

    const body = req.body;

    if (!body || !body.prompt) {
        return res.status(400).json({
            error: { message: 'prompt is required', type: 'invalid_request' }
        });
    }

    const model = body.model || 'flux.1-schnell';
    if (!ALLOWED_IMAGE_MODELS.includes(model)) {
        return res.status(400).json({
            error: {
                message: `model "${model}" not available for images. options: ${ALLOWED_IMAGE_MODELS.join(', ')}`,
                type: 'invalid_request'
            }
        });
    }

    const sanitized = {
        model: model,
        prompt: body.prompt,
        n: body.n ?? 1,
        size: body.size ?? '1024x1024'
    };

    const result = await proxyImageRequest(sanitized);
    return res.status(result.status).json(result.body);
};
