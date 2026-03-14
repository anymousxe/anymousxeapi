// ratelimit.js — in-memory rate limiter for Cloudflare Workers (ESM)
// Resets on cold start but that's fine for Workers

const windowMs = 60 * 1000; // 1 minute window
const store = new Map();

export function rateLimit(apiKey, maxRequests = 30) {
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
            resetIn: Math.ceil((timestamps[0] + windowMs - now) / 1000),
        };
    }

    timestamps.push(now);
    return {
        allowed: true,
        remaining: maxRequests - timestamps.length,
        resetIn: Math.ceil(windowMs / 1000),
    };
}

// Probabilistic cleanup (no setInterval in Workers)
export function maybeCleanup() {
    if (Math.random() < 0.05) {
        const cutoff = Date.now() - windowMs;
        for (const [key, timestamps] of store.entries()) {
            const filtered = timestamps.filter(t => t > cutoff);
            if (filtered.length === 0) {
                store.delete(key);
            } else {
                store.set(key, filtered);
            }
        }
    }
}
