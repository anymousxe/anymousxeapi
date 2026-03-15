// AnyLM — Cloudflare Workers entry point
// Single worker with URL-based routing

import { handleCompletions } from './routes/completions.js';
import { handleModels } from './routes/models.js';
import { handleConfig } from './routes/config.js';
import { handleVersion } from './routes/version.js';
import { handleKeys } from './routes/keys.js';
import { handleCredits } from './routes/credits.js';
import { handleAdmin } from './routes/admin.js';
import { handleImageGen } from './routes/images.js';
import { handleMoonpayWebhook } from './routes/webhook-moonpay.js';
import { handleSignup } from './routes/auth-signup.js';

function parseDotEnv(str) {
    if (!str) return {};
    const lines = str.split('\n');
    const res = {};
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        res[key] = val;
    }
    return res;
}

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Access-Control-Allow-Origin': '*',
};

function corsHeaders() {
    return {
        ...SECURITY_HEADERS,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    };
}

function addHeaders(response) {
    const newResponse = new Response(response.body, response);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        newResponse.headers.set(key, value);
    }
    return newResponse;
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        request.__rawEnvKeys = Object.keys(env);
        const path = url.pathname;
        const method = request.method;

        // Try both '.env' and 'env' as the secret name
        const envBlob = env['.env'] || env['env'] || env['ENV'];
        const dotEnv = parseDotEnv(envBlob);
        
        const mergedEnv = new Proxy(env, {
            get(target, prop) {
                if (prop === '__dotEnvKeys') return Object.keys(dotEnv);
                if (prop === '__envKeys') return Object.keys(target);
                
                const dotVal = dotEnv[prop];
                const targetVal = target[prop];

                // Prioritize .env (dotEnv) over Cloudflare/Wrangler vars
                if (dotVal !== undefined) return dotVal;
                if (targetVal !== undefined) return typeof targetVal === 'function' ? targetVal.bind(target) : targetVal;
                return undefined;
            },
            ownKeys(target) {
                const keys = Array.from(new Set([...Reflect.ownKeys(target), ...Object.keys(dotEnv)]));
                return keys.filter(k => typeof k === 'string');
            },
            getOwnPropertyDescriptor(target, prop) {
                const desc = Reflect.getOwnPropertyDescriptor(target, prop);
                if (desc) return desc;
                if (dotEnv[prop] !== undefined) return { enumerable: true, configurable: true, value: dotEnv[prop], writable: true };
                return undefined;
            }
        });

        // CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, { status: 200, headers: corsHeaders() });
        }

        let response;

        try {
            // API routes
            if (path === '/v1/chat/completions' && method === 'POST') {
                response = await handleCompletions(request, mergedEnv, ctx);
            } else if (path === '/v1/models' && method === 'GET') {
                response = await handleModels(request, mergedEnv);
            } else if (path === '/v1/config' && method === 'GET') {
                response = await handleConfig(request, mergedEnv);
            } else if (path === '/v1/version' && method === 'GET') {
                response = await handleVersion(request, mergedEnv);
            } else if (path.startsWith('/v1/keys')) {
                response = await handleKeys(request, mergedEnv, path, method);
            } else if (path.startsWith('/v1/credits')) {
                response = await handleCredits(request, mergedEnv, path, method);
            } else if (path.startsWith('/v1/admin')) {
                response = await handleAdmin(request, mergedEnv, path, method);
            } else if (path === '/v1/images/generations' && method === 'POST') {
                response = await handleImageGen(request, mergedEnv, ctx);
            } else if (path === '/v1/webhooks/moonpay' && method === 'POST') {
                response = await handleMoonpayWebhook(request, mergedEnv);
            } else if (path === '/v1/auth/signup' && method === 'POST') {
                response = await handleSignup(request, mergedEnv);
            }
            // Static file serving — serve from KV or fallback
            else if (path === '/' || path === '/index.html') {
                response = await serveAsset(mergedEnv, 'index.html');
            } else if (path === '/chat' || path === '/chat.html' || path.startsWith('/chat/')) {
                // Route all /chat/* virtual paths to chat.html
                response = await serveAsset(mergedEnv, 'chat.html');
            } else if (path === '/models' || path === '/models.html') {
                response = await serveAsset(mergedEnv, 'models.html');
            } else {
                // Try to serve static assets from __STATIC_CONTENT
                const assetPath = path.startsWith('/') ? path.slice(1) : path;
                response = await serveAsset(mergedEnv, assetPath);
            }

            if (!response) {
                response = Response.json(
                    { error: { message: 'not found' } },
                    { status: 404 }
                );
            }
        } catch (err) {
            console.error('[worker] Unhandled error:', err);
            response = Response.json(
                { error: { message: 'internal server error' } },
                { status: 500 }
            );
        }

        return addHeaders(response);
    },
};

async function serveAsset(env, path) {
    // Ensure path has leading slash
    const assetPath = path.startsWith('/') ? path : '/' + path;
    
    const binding = env.ASSETS || env.assets || env.__STATIC_CONTENT;
    
    if (binding && typeof binding.fetch === 'function') {
        try {
            const res = await binding.fetch(new Request('https://anylm.anymousxe-info.workers.dev' + assetPath));
            if (res.ok) return res;
        } catch (e) {
            console.error('Asset fetch error:', e);
        }
    }

    // 2. Try Workers Sites (__STATIC_CONTENT)
    if (env.__STATIC_CONTENT) {
        try {
            const asset = await env.__STATIC_CONTENT.get(path);
            if (asset) {
                const contentType = getContentType(path);
                return new Response(asset, {
                    headers: { 'Content-Type': contentType },
                });
            }
        } catch (_) {}
    }
    return null;
}

function getContentType(path) {
    const ext = path.split('.').pop().toLowerCase();
    const types = {
        html: 'text/html; charset=utf-8',
        css: 'text/css; charset=utf-8',
        js: 'application/javascript; charset=utf-8',
        json: 'application/json',
        svg: 'image/svg+xml',
        png: 'image/png',
        jpg: 'image/jpeg',
        ico: 'image/x-icon',
    };
    return types[ext] || 'application/octet-stream';
}
