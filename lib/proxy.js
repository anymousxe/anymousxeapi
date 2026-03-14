// proxy.js — fallback proxy for Cloudflare Workers (ESM)
// Tries each backend key until one works

import { resolveModel } from './models.js';

const BASE_URL = 'https://api.literouter.com/v1';
const IMAGE_BASE_URL = 'https://image.literouter.com';

export function getBackendKeys(env) {
    const keys = [];
    for (let i = 1; i <= 15; i++) {
        const key = env[`API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    return keys;
}

export async function proxyRequest(body, env) {
    const keys = getBackendKeys(env);

    if (keys.length === 0) {
        return {
            status: 500,
            body: { error: { message: 'no backend keys configured', type: 'server_error' } },
        };
    }

    // Resolve model alias before sending
    const resolvedBody = { ...body, model: resolveModel(body.model) };

    for (let i = 0; i < keys.length; i++) {
        try {
            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys[i]}`,
                },
                body: JSON.stringify(resolvedBody),
            });

            if (response.status === 429 || response.status === 401 || response.status === 403) {
                const text = await response.text().catch(() => '');
                console.error(`[proxyRequest] Key ${i} failed with ${response.status}: ${text}`);
                continue;
            }

            if (response.status >= 500) {
                const text = await response.text().catch(() => '');
                console.error(`[proxyRequest] Key ${i} failed with ${response.status}: ${text}`);
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
                        'Connection': 'keep-alive',
                    },
                };
            }

            const data = await response.json();
            return { status: response.status, body: data };
        } catch (err) {
            console.error(`[proxyRequest] Key ${i} threw error: ${err.message}`);
            continue;
        }
    }

    return {
        status: 429,
        body: {
            error: {
                message: 'All keys failed (rate limit, unauthorized, or internal error). Check server logs.',
                type: 'server_error',
                code: 'all_keys_failed',
            },
        },
    };
}

export async function proxyImageRequest(body, env) {
    const keys = getBackendKeys(env);

    if (keys.length === 0) {
        return {
            status: 500,
            body: { error: { message: 'no backend keys configured', type: 'server_error' } },
        };
    }

    for (let i = 0; i < keys.length; i++) {
        try {
            const response = await fetch(`${IMAGE_BASE_URL}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys[i]}`,
                },
                body: JSON.stringify(body),
            });

            if (response.status === 429 || response.status === 401 || response.status === 403) {
                const text = await response.text().catch(() => '');
                console.error(`[proxyImageRequest] Key ${i} failed with ${response.status}: ${text}`);
                continue;
            }

            if (response.status >= 500) {
                const text = await response.text().catch(() => '');
                console.error(`[proxyImageRequest] Key ${i} failed with ${response.status}: ${text}`);
                continue;
            }

            const contentType = response.headers.get('content-type') || '';
            let data;
            // Handle binary response
            if (contentType.includes('image/')) {
                const arrayBuffer = await response.arrayBuffer();
                // Send back as base64 or a blob format?
                // For proxying, we can return the arrayBuffer and let the router format it
                return { 
                    status: response.status, 
                    body: arrayBuffer,
                    isBinary: true,
                    contentType 
                };
            } else {
                data = await response.json();
                return { status: response.status, body: data };
            }

        } catch (err) {
            console.error(`[proxyImageRequest] Key ${i} threw error: ${err.message}`);
            continue;
        }
    }

    return {
        status: 429,
        body: {
            error: {
                message: 'rate limit hit across all available keys. try again in a bit',
                type: 'rate_limit_exceeded',
                code: 'rate_limit',
            },
        },
    };
}

export { resolveModel };
