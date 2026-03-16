// Chat completions proxy — Cloudflare Workers route
import { authenticate } from '../../lib/auth.js';
import { proxyRequest } from '../../lib/proxy.js';
import { rateLimit, maybeCleanup } from '../../lib/ratelimit.js';
import { isFreeModel, RATE_LIMITS, getAllowedModelIds, isValidModel, MODELS, getDailyLimit } from '../../lib/models.js';
import { canAfford, calculateCost, deductCredits } from '../../lib/credits.js';
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

    const isApiUsage = !!user.apiKeyId;
    
    // Rate limiting: API usage uses model-specific limits. Chat uses Plan-based limits.
    let maxReq = RATE_LIMITS[user.plan] || RATE_LIMITS.free;
    
    if (isApiUsage) {
        // Use user-defined RPM from API key metadata.
        // Default 60 RPM if rate_limit column doesn't exist yet.
        // Users can customize 20-120 RPM via the API Management page.
        maxReq = user.rateLimit || 60;
    } else if (modelData?.rateLimit) {
        // Chat UI: Use model-specific limits if defined
        maxReq = modelData.rateLimit;
    }
    
    let limitKey = isApiUsage ? `${user.userId}:api:${model}` : user.userId;
    
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

    // Daily Usage Limit Check (Chat UI only)
    if (!isApiUsage && !user.isAdmin) {
        const dailyLimit = getDailyLimit(user.plan, model);
        const today = new Date().toISOString().split('T')[0]; // UTC date
        
        const { data: usageCount, error: usageErr } = await env.SUPABASE.rpc('increment_usage', {
            p_user_id: user.userId,
            p_model_id: model,
            p_date: today
        });
        
        if (usageErr) {
            console.error('[completions] Daily usage increment error:', usageErr);
        } else if (usageCount > dailyLimit && dailyLimit < 99999) {
            return Response.json(
                { error: { message: `Daily limit reached for ${MODELS[model]?.name || model}. Limit: ${dailyLimit}/day. Upgrade for more!` } },
                { status: 429 }
            );
        }
    }

    // Check model access (Bypass for API keys)
    const allowed = getAllowedModelIds(user.plan);
    if (!allowed.includes(model) && !isApiUsage) {
        return Response.json(
            { error: { message: `plan upgrade required for ${model}` } },
            { status: 403 }
        );
    }

    // Credit check for paid models only (API usage only)
    if (isApiUsage && !isFreeModel(model, true) && !canAfford(model, user.balance, true)) {
        return new Response(JSON.stringify({ error: { message: 'Insufficient credits (API usage)' } }), {
            status: 402,
            headers: { 'Content-Type': 'application/json' },
        });
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
    if (body.web_search && model !== 'tongyi-deepresearch-30b-a3b') {
        actualModel = 'tongyi-deepresearch-30b-a3b';
    }
    const isImageModel = MODELS[actualModel]?.type === 'image';

    // Force thinking for non-reasoning models
    const modelConfig = MODELS[actualModel];
    if (modelConfig && !isImageModel && !modelConfig.isReasoning) {
        const thinkPrompt = "You are a reasoning model. You MUST follow this exact structure:\n1. Start your response with `<think>`\n2. Write your internal reasoning process\n3. End your reasoning with `</think>` (using the backward slash /)\n4. Provide your final answer after the closing tag.\n\nExample:\n<think>\nReasoning here\n</think>\nFinal answer here";
        // Check if there's already a system message
        const currentMessages = body.messages || [];
        const systemMsg = currentMessages.find(m => m.role === 'system');
        if (systemMsg) {
            systemMsg.content = `${thinkPrompt}\n\n${systemMsg.content}`;
        } else {
            currentMessages.unshift({ role: 'system', content: thinkPrompt });
        }
        body.messages = currentMessages;
    }

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

                    if (isApiUsage && !isFreeModel(actualModel, true)) {
                        const estimatedInput = messages.reduce((sum, m) => {
                            const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
                            return sum + Math.ceil(content.length / 4);
                        }, 0);
                        const estimatedOutput = Math.ceil(totalContent.length / 4);
                        const rateLimit = user.rateLimit || 60;
                        const multiplier = rateLimit / 20.0;
                        const cost = calculateCost(actualModel, estimatedInput, estimatedOutput, multiplier);
                        console.log(`[billing] stream done: model=${actualModel} in=${estimatedInput} out=${estimatedOutput} mult=${multiplier} cost=$${cost}`);
                        if (cost > 0) {
                            await deductCredits(env, user.userId, cost, actualModel, estimatedInput, estimatedOutput, user.apiKeyId);
                        } else {
                            console.warn(`[billing] cost is 0 or NaN, skipping deduction. cost=${cost}`);
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
        if (isApiUsage && !isFreeModel(actualModel, true)) {
            const promptTokens = result.body?.usage?.prompt_tokens || 0;
            const completionTokens = result.body?.usage?.completion_tokens || 0;
            // Estimate tokens if usage is missing from response
            const inputTokens = promptTokens > 0 ? promptTokens : messages.reduce((sum, m) => {
                const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
                return sum + Math.ceil(content.length / 4);
            }, 0);
            const outputTokens = completionTokens > 0 ? completionTokens : Math.ceil(
                JSON.stringify(result.body?.choices?.[0]?.message?.content || '').length / 4
            );
            const rateLimit = user.rateLimit || 60;
            const multiplier = rateLimit / 20.0;
            const cost = calculateCost(actualModel, inputTokens, outputTokens, multiplier);
            console.log(`[billing] non-stream: model=${actualModel} in=${inputTokens} out=${outputTokens} mult=${multiplier} cost=$${cost}`);
            if (cost > 0) {
                ctx.waitUntil(
                    deductCredits(env, user.userId, cost, actualModel, inputTokens, outputTokens, user.apiKeyId)
                );
            } else {
                console.warn(`[billing] cost is 0 or NaN, skipping deduction. cost=${cost}`);
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
