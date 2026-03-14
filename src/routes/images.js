// Image generation endpoint
import { authenticate } from '../../lib/auth.js';
import { proxyImageRequest } from '../../lib/proxy.js';
import { MODELS } from '../../lib/models.js';
import { canAfford, calculateCost, deductCredits } from '../../lib/credits.js';

export async function handleImageGen(request, env, ctx) {
    let user;
    try {
        user = await authenticate(request, env);
    } catch (err) {
        return Response.json({ error: { message: err.message } }, { status: err.status || 401 });
    }

    // Requires Plus+ plan
    const planRank = { free: 0, plus: 1, pro: 2, admin: 99 };
    if ((planRank[user.plan] || 0) < 1) {
        return Response.json(
            { error: { message: 'Plus plan or higher required for image generation' } },
            { status: 403 }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: { message: 'invalid JSON' } }, { status: 400 });
    }

    const model = body.model || 'dreamshaper-v1';
    const validImageModels = ['dreamshaper-v1', 'p-image'];
    if (!validImageModels.includes(model)) {
        return Response.json({ error: { message: `invalid image model: ${model}` } }, { status: 400 });
    }

    // Check credits
    const modelData = MODELS[model];
    if (!canAfford(model, user.balance) && !user.isAdmin) {
        return Response.json(
            { error: { message: 'insufficient credits' } },
            { status: 402 }
        );
    }

    try {
        const resolvedBody = {
            ...body,
            model: modelData?.literouter_id || model,
        };

        const result = await proxyImageRequest(resolvedBody, env);

        // Deduct credits per image
        if (!user.isAdmin && modelData?.pricing?.per_image) {
            const numImages = body.n || 1;
            const cost = modelData.pricing.per_image * numImages;
            ctx.waitUntil(
                deductCredits(env, user.userId, cost, model, 0, 0, user.apiKeyId)
            );
        }

        if (result.isBinary) {
            return new Response(result.body, {
                status: result.status,
                headers: { 'Content-Type': result.contentType || 'image/jpeg' }
            });
        }

        return Response.json(result.body, { status: result.status });
    } catch (err) {
        console.error('[images] Error:', err);
        return Response.json({ error: { message: 'image generation failed' } }, { status: 502 });
    }
}
