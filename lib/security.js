// security.js - Basic Security Headers and Request Throttling

const requestCache = new Map();

function setSecurityHeaders(res) {
    if (!res) return;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

function checkRateLimit(req, res, maxPerMinute = 60) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const windowStart = now - 60000;

    let record = requestCache.get(ip);

    if (!record) {
        record = { count: 1, reset: now + 60000 };
        requestCache.set(ip, record);
    } else {
        if (now > record.reset) {
            record.count = 1;
            record.reset = now + 60000;
        } else {
            record.count++;
        }
    }

    if (record.count > maxPerMinute) {
        if (res) {
            res.status(429).json({
                error: { message: 'Too many requests, please slow down.' }
            });
        }
        return false;
    }

    // Clean up old entries periodically (10% chance per request)
    if (Math.random() < 0.1) {
        for (const [key, val] of requestCache.entries()) {
            if (now > val.reset) requestCache.delete(key);
        }
    }

    return true;
}

module.exports = { setSecurityHeaders, checkRateLimit };
