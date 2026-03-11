// chat completions proxy
const { validateKey } = require('../../../lib/keys');
const { proxyRequest } = require('../../../lib/proxy');
const { rateLimit } = require('../../../lib/ratelimit');
const { setSecurityHeaders, checkRateLimit } = require('../../../lib/security');

// Source of truth for model tiers matching models.js
const FREE_MODELS = ['gpt-5.4', 'gemini-3.1-pro-preview', 'glm-5', 'kimi-k2.5', 'deepseek-v3.2', 'qwen3-coder'];
const PLUS_MODELS = [...FREE_MODELS, 'claude-haiku-4.5', 'claude-sonnet-4.6', 'grok-4.1-fast-reasoning', 'grok-4.1-fast-non-reasoning'];
const PRO_MODELS = [...PLUS_MODELS, 'opus'];

module.exports = async function handler(req, res) {
    setSecurityHeaders(res);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: { message: 'POST only' } });
    }

    if (!checkRateLimit(req, res, 60)) return;

    const authHeader = req.headers['authorization'] || '';
    const apiKey = authHeader.replace('Bearer ', '').trim();

    if (!apiKey) {
        return res.status(401).json({ error: { message: 'missing api key' } });
    }

    let userPlan = 'free';
    let maxRequests = 10; // default free limit
    let isSupabaseUser = false;
    let allowedModels = FREE_MODELS;

    const keyData = validateKey(apiKey);

    if (!keyData) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const anonKey = process.env.SUPABASE_ANON_KEY;

        if (apiKey && supabaseUrl && anonKey) {
            try {
                const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'apikey': anonKey }
                });

                if (userRes.ok) {
                    const user = await userRes.json();
                    isSupabaseUser = true;

                    // ADMIN OVERRIDE
                    const isAdmin = user.email === 'anymousxe.info@gmail.com' || user.user_metadata?.username === 'anymousxe';

                    if (isAdmin) {
                        userPlan = 'pro';
                        maxRequests = 999999;
                    } else {
                        const planRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}&select=plan`, {
                            headers: { 'Authorization': `Bearer ${apiKey}`, 'apikey': anonKey }
                        });

                        if (planRes.ok) {
                            const planData = await planRes.json();
                            if (planData?.[0]?.plan) {
                                userPlan = planData[0].plan;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('[completions] Supabase error:', err.message);
            }
        }

        if (!isSupabaseUser) {
            return res.status(401).json({ error: { message: 'invalid session' } });
        }
    } else {
        userPlan = 'pro'; // Custom API keys get Pro
        maxRequests = 5000;
    }

    // Set tier-based limits
    if (userPlan === 'plus') {
        allowedModels = PLUS_MODELS;
        maxRequests = Math.max(maxRequests, 100);
    } else if (userPlan === 'pro') {
        allowedModels = PRO_MODELS;
        maxRequests = Math.max(maxRequests, 1000);
    }

    const limit = rateLimit(apiKey, maxRequests);
    res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
    res.setHeader('X-RateLimit-Reset', String(limit.resetIn));

    if (!limit.allowed && userPlan !== 'pro') {
        return res.status(429).json({ error: { message: 'rate limit exceeded' } });
    }

    const { model, messages, stream, temperature, max_tokens } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: { message: 'messages required' } });
    }

    if (!model || !allowedModels.includes(model)) {
        return res.status(403).json({ error: { message: `plan upgrade required for ${model}` } });
    }

    const sanitized = {
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 4096,
        stream: !!stream
    };

    try {
        const result = await proxyRequest(sanitized);

        if (result.stream) {
            for (const [key, value] of Object.entries(result.headers || {})) {
                res.setHeader(key, value);
            }
            res.status(result.status);

            // Safe stream handling for both Node and Web streams
            if (result.stream.pipe) {
                result.stream.pipe(res);
            } else if (result.stream.getReader) {
                const reader = result.stream.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                }
                res.end();
            } else {
                // Fallback for async iterables
                for await (const chunk of result.stream) {
                    res.write(chunk);
                }
                res.end();
            }
            return;
        }

        return res.status(result.status).json(result.body);
    } catch (err) {
        console.error('[completions] Proxy error:', err.message);
        return res.status(502).json({ error: { message: 'AI provider error' } });
    }
};
