// chat completions proxy
const { validateKey } = require('../../../lib/keys');
const { proxyRequest } = require('../../../lib/proxy');
const { rateLimit } = require('../../../lib/ratelimit');

const ALLOWED_MODELS = ['gpt-5.4', 'gemini-3.1-pro-preview', 'glm-5', 'kimi-k2.5', 'deepseek-v3.2'];

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

    let userPlan = 'free';
    let maxRequests = 2; // free limit
    let isSupabaseUser = false;
    let allowedModels = ['gpt-5.4', 'gemini-3.1-pro-preview', 'glm-5', 'kimi-k2.5', 'deepseek-v3.2', 'qwen3-coder'];

    const keyData = validateKey(apiKey);

    if (!keyData) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const anonKey = process.env.SUPABASE_ANON_KEY;

        if (apiKey && supabaseUrl && anonKey) {
            try {
                // verify token by getting user
                const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'apikey': anonKey }
                });

                if (userRes.ok) {
                    const user = await userRes.json();
                    isSupabaseUser = true;

                    // get plan from users table
                    const planRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}&select=plan`, {
                        headers: { 'Authorization': `Bearer ${apiKey}`, 'apikey': anonKey }
                    });

                    if (planRes.ok) {
                        const planData = await planRes.json();
                        if (planData && planData.length > 0 && planData[0].plan) {
                            userPlan = planData[0].plan;
                        }
                    }
                }
            } catch (err) {
                // fetch failed
            }
        }

        if (!isSupabaseUser) {
            return res.status(401).json({
                error: { message: 'invalid api key or session', type: 'auth_error' }
            });
        }
    } else {
        // give regular api keys pro access
        userPlan = 'pro';
    }

    // adjust limits based on plan
    if (userPlan === 'plus') {
        maxRequests = 8;
        allowedModels.push('claude-haiku-4.5', 'claude-sonnet-4.6', 'grok-4.1-fast-reasoning', 'grok-4.1-fast-non-reasoning');
    } else if (userPlan === 'pro') {
        maxRequests = 50;
        allowedModels.push('claude-haiku-4.5', 'claude-sonnet-4.6', 'grok-4.1-fast-reasoning', 'grok-4.1-fast-non-reasoning', 'opus');
    }

    const limit = rateLimit(apiKey, maxRequests);
    res.setHeader('X-RateLimit-Remaining', limit.remaining);
    res.setHeader('X-RateLimit-Reset', limit.resetIn);

    if (!limit.allowed) {
        return res.status(429).json({
            error: {
                message: `rate limited. upgrade plan or try again in ${limit.resetIn}s`,
                type: 'rate_limit_exceeded'
            }
        });
    }

    const body = req.body;

    if (!body || !body.messages || !Array.isArray(body.messages)) {
        return res.status(400).json({
            error: { message: 'messages array required', type: 'invalid_request' }
        });
    }

    if (!body.model) {
        return res.status(400).json({
            error: { message: 'model is required. available: ' + allowedModels.join(', '), type: 'invalid_request' }
        });
    }

    if (!allowedModels.includes(body.model)) {
        return res.status(403).json({
            error: {
                message: `model "${body.model}" requires a higher plan or does not exist. options: ${allowedModels.join(', ')}`,
                type: 'forbidden_model'
            }
        });
    }

    const sanitized = {
        model: body.model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 4096,
        stream: body.stream ?? false,
        top_p: body.top_p ?? 1
    };

    const result = await proxyRequest(sanitized);

    if (result.stream) {
        for (const [key, value] of Object.entries(result.headers || {})) {
            res.setHeader(key, value);
        }
        res.status(result.status);

        const reader = result.stream.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        } catch (e) {
            // stream broke
        } finally {
            res.end();
        }
        return;
    }

    return res.status(result.status).json(result.body);
};
