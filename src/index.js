// AnymousxeAPI — Cloudflare Workers entry point
// Single worker with URL-based routing

import { handleCompletions } from './routes/completions.js';
import { handleModels } from './routes/models.js';
import { handleConfig } from './routes/config.js';
import { handleVersion } from './routes/version.js';
import { handleSendCode } from './routes/auth-send-code.js';
import { handleVerifyCode } from './routes/auth-verify-code.js';
import { handleKeys } from './routes/keys.js';
import { handleCredits } from './routes/credits.js';
import { handleAdmin } from './routes/admin.js';
import { handleImageGen } from './routes/images.js';
import { handleMoonpayWebhook } from './routes/webhook-moonpay.js';

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
        const path = url.pathname;
        const method = request.method;

        // CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, { status: 200, headers: corsHeaders() });
        }

        let response;

        try {
            // API routes
            if (path === '/v1/chat/completions' && method === 'POST') {
                response = await handleCompletions(request, env, ctx);
            } else if (path === '/v1/models' && method === 'GET') {
                response = await handleModels(request, env);
            } else if (path === '/v1/config' && method === 'GET') {
                response = await handleConfig(request, env);
            } else if (path === '/v1/version' && method === 'GET') {
                response = await handleVersion(request, env);
            } else if (path === '/v1/auth/send-code' && method === 'POST') {
                response = await handleSendCode(request, env);
            } else if (path === '/v1/auth/verify-code' && method === 'POST') {
                response = await handleVerifyCode(request, env);
            } else if (path.startsWith('/v1/keys')) {
                response = await handleKeys(request, env, path, method);
            } else if (path.startsWith('/v1/credits')) {
                response = await handleCredits(request, env, path, method);
            } else if (path.startsWith('/v1/admin')) {
                response = await handleAdmin(request, env, path, method);
            } else if (path === '/v1/images/generations' && method === 'POST') {
                response = await handleImageGen(request, env, ctx);
            } else if (path === '/v1/webhooks/moonpay' && method === 'POST') {
                response = await handleMoonpayWebhook(request, env);
            }
            // Static file serving — serve from KV or fallback
            else if (path === '/' || path === '/index.html') {
                response = await serveAsset(env, 'index.html');
            } else if (path === '/chat' || path === '/chat.html' || path.startsWith('/chat/')) {
                response = await serveAsset(env, 'chat.html');
            } else if (path === '/models' || path === '/models.html') {
                response = await serveAsset(env, 'models.html');
            } else {
                // Try to serve static assets from __STATIC_CONTENT
                const assetPath = path.startsWith('/') ? path.slice(1) : path;
                response = await serveAsset(env, assetPath);
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
    // Cloudflare Workers Sites uses __STATIC_CONTENT KV binding
    if (env.__STATIC_CONTENT) {
        try {
            const asset = await env.__STATIC_CONTENT.get(path);
            if (asset) {
                const contentType = getContentType(path);
                return new Response(asset, {
                    headers: { 'Content-Type': contentType },
                });
            }
        } catch {
            // Asset not found
        }
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
