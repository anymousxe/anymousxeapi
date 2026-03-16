import { authenticate, getSupabase } from '../../lib/auth.js';
import { MODELS, getDailyLimit } from '../../lib/models.js';

export async function handleUserUsage(request, env) {
    let user;
    try {
        user = await authenticate(request, env);
    } catch (err) {
        return Response.json({ error: { message: 'unauthorized' } }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch all usage for today for this user
    const sb = getSupabase(env);
    const { data: usageData, error } = await sb
        .from('user_daily_usage')
        .select('model_id, usage_count')
        .eq('user_id', user.userId)
        .eq('date', today);

    if (error) {
        return Response.json({ error: { message: 'failed to fetch usage' } }, { status: 500 });
    }

    // Map usage data to limits
    const stats = Object.keys(MODELS).filter(id => MODELS[id].type === 'chat').map(id => {
        const usage = usageData.find(u => u.model_id === id)?.usage_count || 0;
        const limit = getDailyLimit(user.plan, id);
        return {
            id,
            name: MODELS[id].name,
            usage,
            limit: limit >= 99999 ? 'Unlimited' : limit,
            remaining: limit >= 99999 ? 'Unlimited' : Math.max(0, limit - usage)
        };
    });

    return Response.json({
        date: today,
        plan: user.plan,
        stats
    });
}
