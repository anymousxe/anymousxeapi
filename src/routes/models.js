// Models list endpoint
import { MODELS } from '../../lib/models.js';

export async function handleModels() {
    const models = Object.values(MODELS)
        .filter(m => m.tier !== 'internal')
        .map(m => ({
            id: m.id,
            object: 'model',
            created: 1700000000,
            owned_by: 'anymousxe',
            type: m.type,
            plan: m.tier,
            provider: m.provider,
            name: m.name,
            description: m.description,
            pricing: m.pricing,
        }));

    return Response.json({ object: 'list', data: models });
}
