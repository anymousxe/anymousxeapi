// rate limiter so people dont spam and crash everything 🛡️
// resets on cold start but thats fine for serverless tbh

const windowMs = 60 * 1000; // 1 minute window
const maxRequests = 30; // 30 req per minute per key

// in-memory store - each serverless instance gets its own
const store = new Map();

function rateLimit(apiKey) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!store.has(apiKey)) {
        store.set(apiKey, []);
    }

    const timestamps = store.get(apiKey).filter(t => t > windowStart);
    store.set(apiKey, timestamps);

    if (timestamps.length >= maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: Math.ceil((timestamps[0] + windowMs - now) / 1000)
        };
    }

    timestamps.push(now);
    return {
        allowed: true,
        remaining: maxRequests - timestamps.length,
        resetIn: Math.ceil(windowMs / 1000)
    };
}

// clean up old entries every 5 min so memory doesnt explode
setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of store.entries()) {
        const filtered = timestamps.filter(t => t > cutoff);
        if (filtered.length === 0) {
            store.delete(key);
        } else {
            store.set(key, filtered);
        }
    }
}, 5 * 60 * 1000);

module.exports = { rateLimit };
