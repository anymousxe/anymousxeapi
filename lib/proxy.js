// fallback proxy - tries each backend key until one works

const BASE_URL = 'https://api.literouter.com/v1';

// model name mapping: what users send -> what literouter expects
const MODEL_MAP = {
    'deepseek-v3.2': 'deepseek-v3.2-official'
};

function resolveModel(model) {
    return MODEL_MAP[model] || model;
}

function getBackendKeys() {
    const keys = [];
    for (let i = 1; i <= 15; i++) {
        const key = process.env[`API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    return keys;
}

async function proxyRequest(body) {
    const keys = getBackendKeys();

    if (keys.length === 0) {
        return {
            status: 500,
            body: { error: { message: 'no backend keys configured', type: 'server_error' } }
        };
    }

    // resolve model alias before sending
    const resolvedBody = { ...body, model: resolveModel(body.model) };

    for (let i = 0; i < keys.length; i++) {
        try {
            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys[i]}`
                },
                body: JSON.stringify(resolvedBody)
            });

            if (response.status === 429 || response.status === 401 || response.status === 403) {
                continue;
            }

            if (response.status >= 500) {
                continue;
            }

            const contentType = response.headers.get('content-type') || '';

            if (resolvedBody.stream && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
                return {
                    status: response.status,
                    stream: response.body,
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    }
                };
            }

            const data = await response.json();
            return { status: response.status, body: data };

        } catch (err) {
            // ts tuff mango
            continue;
        }
    }

    return {
        status: 429,
        body: {
            error: {
                message: 'rate limit hit across all available keys. try again in a bit',
                type: 'rate_limit_exceeded',
                code: 'rate_limit'
            }
        }
    };
}

async function proxyImageRequest(body) {
    const keys = getBackendKeys();

    if (keys.length === 0) {
        return {
            status: 500,
            body: { error: { message: 'no backend keys configured', type: 'server_error' } }
        };
    }

    for (let i = 0; i < keys.length; i++) {
        try {
            const response = await fetch(`${BASE_URL}/images/generations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys[i]}`
                },
                body: JSON.stringify(body)
            });

            if (response.status === 429 || response.status === 401 || response.status === 403) {
                continue;
            }

            if (response.status >= 500) {
                continue;
            }

            const data = await response.json();
            return { status: response.status, body: data };

        } catch (err) {
            continue;
        }
    }

    return {
        status: 429,
        body: {
            error: {
                message: 'rate limit hit across all available keys. try again in a bit',
                type: 'rate_limit_exceeded',
                code: 'rate_limit'
            }
        }
    };
}

module.exports = { proxyRequest, proxyImageRequest, getBackendKeys, resolveModel };
