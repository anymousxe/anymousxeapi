// the magic fallback machine - if one key dies we keep it pushing 🏃‍♂️

const BASE_URL = 'https://api.literouter.com/v1';

function getBackendKeys() {
    // grab every API_KEY_1 through API_KEY_15 thats not empty
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
        // no keys configured at all bruh
        return {
            status: 500,
            body: { error: { message: 'no backend keys configured. someone tell the admin', type: 'server_error' } }
        };
    }

    // try each key until one works or we run out
    for (let i = 0; i < keys.length; i++) {
        try {
            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys[i]}`
                },
                body: JSON.stringify(body)
            });

            // if this key is cooked, skip to next
            if (response.status === 429 || response.status === 401 || response.status === 403) {
                // this key is done for, try the next one
                continue;
            }

            if (response.status >= 500) {
                // server is tweaking, try next key
                continue;
            }

            // check if its a streaming response
            const contentType = response.headers.get('content-type') || '';

            if (body.stream && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
                // stream that mf back
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

            // regular json response
            const data = await response.json();
            return { status: response.status, body: data };

        } catch (err) {
            // this key threw up, try next
            // ts tuff mango
            continue;
        }
    }

    // all keys are dead 💀
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

module.exports = { proxyRequest, getBackendKeys };
