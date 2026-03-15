// Chat completions proxy — Cloudflare Workers route
import { authenticate } from '../../lib/auth.js';
import { proxyRequest } from '../../lib/proxy.js';
import { rateLimit, maybeCleanup } from '../../lib/ratelimit.js';
import { RATE_LIMITS, getAllowedModelIds, isValidModel, MODELS } from '../../lib/models.js';
import { isFreeModel, canAfford, calculateCost, deductCredits } from '../../lib/credits.js';
import { proxyImageRequest } from '../../lib/proxy.js';

export async function handleCompletions(request, env, ctx) {
    maybeCleanup();

    let user;
    try {
        user = await authenticate(request, env);
    } catch (err) {
        return Response.json(
            { error: { message: err.message || 'unauthorized' } },
            { status: err.status || 401 }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: { message: 'invalid JSON body' } }, { status: 400 });
    }

    const { model, messages, stream, temperature, max_tokens } = body;
    const modelData = MODELS[model];

    // Rate limiting: API usage uses model-specific limits. Chat uses Plan-based limits.
    let maxReq = RATE_LIMITS[user.plan] || RATE_LIMITS.free;
    let limitKey = user.userId;

    if (user.apiKeyId) {
        // API Key usage: Use model-specific limits
        if (modelData?.rateLimit) {
            maxReq = modelData.rateLimit;
            limitKey = `${user.userId}:${model}`;
        }
    }
    
    // Admin always gets high limits
    if (user.isAdmin) maxReq = 999999;

    const limit = rateLimit(limitKey, maxReq);

    if (!limit.allowed && !user.isAdmin) {
        return Response.json(
            { error: { message: 'rate limit exceeded' } },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(limit.resetIn),
                },
            }
        );
    }

    if (!messages || !Array.isArray(messages)) {
        return Response.json({ error: { message: 'messages required' } }, { status: 400 });
    }

    if (!model || !isValidModel(model)) {
        return Response.json({ error: { message: `invalid model: ${model}` } }, { status: 400 });
    }

    // Check model access
    const allowed = getAllowedModelIds(user.plan);
    if (!allowed.includes(model)) {
        return Response.json(
            { error: { message: `plan upgrade required for ${model}` } },
            { status: 403 }
        );
    }

    // Check credits for paid models
    if (!isFreeModel(model) && !canAfford(model, user.balance) && !user.isAdmin) {
        return Response.json(
            { error: { message: 'insufficient credits', type: 'insufficient_credits', code: 'credits_required' } },
            { status: 402 }
        );
    }

    // Auto-feature: vision detection
    let actualModel = model;
    const hasImages = messages.some(m =>
        Array.isArray(m.content) && m.content.some(c => c.type === 'image_url' || c.type === 'image')
    );
    if (hasImages && model !== 'command-a-vision-07-2025') {
        actualModel = 'command-a-vision-07-2025';
    }

    // Auto-feature: web search
    if (body.web_search && model !== 'gpt-4o-search-preview') {
        actualModel = 'gpt-4o-search-preview';
    }

    const isImageModel = MODELS[actualModel]?.type === 'image';

    try {
        let result;
        
        if (isImageModel) {
            // Convert chat messages to image prompt
            const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user');
            if (!lastUserMessage) {
                return Response.json({ error: { message: 'no user message found for image prompt' } }, { status: 400 });
            }
            
            const promptContent = typeof lastUserMessage.content === 'string' 
                ? lastUserMessage.content 
                : JSON.stringify(lastUserMessage.content);
                
            const imageBody = {
                prompt: promptContent,
                model: actualModel,
                width: 1024,
                height: 1024
            };
            
            // Call image proxy
            result = await proxyImageRequest(imageBody, env);
            
            // Format binary image response back to chat completion format for UI
            if (result.isBinary && result.body) {
                // Convert array buffer to base64
                const uint8Array = new Uint8Array(result.body);
                let binaryString = '';
                for (let i = 0; i < uint8Array.byteLength; i += 1024) {
                    binaryString += String.fromCharCode.apply(null, uint8Array.subarray(i, i + 1024));
                }
                const b64 = btoa(binaryString);
                
                const mimeType = result.contentType || 'image/jpeg';
                const markdownImage = `![Generated Image](data:${mimeType};base64,${b64})`;
                
                result = {
                    status: 200,
                    body: {
                        id: `img-${Date.now()}`,
                        object: 'chat.completion',
                        created: Math.floor(Date.now() / 1000),
                        model: actualModel,
                        choices: [{
                            index: 0,
                            message: { role: 'assistant', content: markdownImage },
                            finish_reason: 'stop'
                        }],
                        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                    }
                };
            }
            
        } else {
            body.model = actualModel;
            result = await proxyRequest(body, env);
        }

        if (result.stream) {
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            let totalContent = '';

            ctx.waitUntil((async () => {
                const reader = result.stream.getReader();
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        await writer.write(value);
                        totalContent += new TextDecoder().decode(value);
                    }
                } catch (err) {
                    console.error('[completions] stream error:', err);
                } finally {
                    await writer.close();

                    if (!isFreeModel(actualModel) && !user.isAdmin) {
                        const estimatedInput = messages.reduce((sum, m) => {
                            const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
                            return sum + Math.ceil(content.length / 4);
                        }, 0);
                        const estimatedOutput = Math.ceil(totalContent.length / 16);
                        const cost = calculateCost(actualModel, estimatedInput, estimatedOutput);
                        if (cost > 0) {
                            await deductCredits(env, user.userId, cost, actualModel, estimatedInput, estimatedOutput, user.apiKeyId);
                        }
                    }
                }
            })());

            return new Response(readable, {
                status: result.status,
                headers: {
                    ...result.headers,
                    'X-RateLimit-Remaining': String(limit.remaining),
                    'X-RateLimit-Reset': String(limit.resetIn),
                },
            });
        }

        // Non-streaming
        if (!isFreeModel(actualModel) && !user.isAdmin && result.body?.usage) {
            const cost = calculateCost(
                actualModel,
                result.body.usage.prompt_tokens || 0,
                result.body.usage.completion_tokens || 0
            );
            if (cost > 0) {
                ctx.waitUntil(
                    deductCredits(env, user.userId, cost, actualModel, result.body.usage.prompt_tokens, result.body.usage.completion_tokens, user.apiKeyId)
                );
            }
        }

        return Response.json(result.body, {
            status: result.status,
            headers: {
                'X-RateLimit-Remaining': String(limit.remaining),
                'X-RateLimit-Reset': String(limit.resetIn),
            },
        });
    } catch (err) {
        console.error('[completions] Proxy error:', err.message);
        return Response.json({ error: { message: 'AI provider error' } }, { status: 502 });
    }
}
