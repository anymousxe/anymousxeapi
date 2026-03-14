// Credits endpoints
import { authenticate } from '../../lib/auth.js';
import { getBalance, getTransactions, getUsageStats } from '../../lib/credits.js';

export async function handleCredits(request, env, path, method) {
    if (method !== 'GET') {
        return Response.json({ error: { message: 'GET only' } }, { status: 405 });
    }

    let user;
    try {
        user = await authenticate(request, env);
    } catch (err) {
        return Response.json({ error: { message: err.message } }, { status: err.status || 401 });
    }

    // GET /v1/credits — balance + recent transactions
    if (path === '/v1/credits') {
        const balance = await getBalance(env, user.userId);
        const transactions = await getTransactions(env, user.userId, 20);

        return Response.json({
            balance: balance?.balance ?? 0,
            plan: balance?.plan || 'free',
            plan_expires_at: balance?.plan_expires_at || null,
            monthly_allowance: balance?.monthly_allowance ?? 0,
            recent_transactions: transactions,
        });
    }

    // GET /v1/credits/usage — usage stats
    if (path === '/v1/credits/usage') {
        const url = new URL(request.url);
        const days = parseInt(url.searchParams.get('days') || '30', 10);
        const stats = await getUsageStats(env, user.userId, days);

        // Aggregate by model
        const byModel = {};
        for (const tx of stats) {
            if (!byModel[tx.model]) {
                byModel[tx.model] = { requests: 0, cost: 0, tokens_in: 0, tokens_out: 0 };
            }
            byModel[tx.model].requests++;
            byModel[tx.model].cost += Math.abs(tx.amount || 0);
            byModel[tx.model].tokens_in += tx.tokens_in || 0;
            byModel[tx.model].tokens_out += tx.tokens_out || 0;
        }

        return Response.json({
            period_days: days,
            total_requests: stats.length,
            total_cost: stats.reduce((s, t) => s + Math.abs(t.amount || 0), 0),
            by_model: byModel,
        });
    }

    return Response.json({ error: { message: 'not found' } }, { status: 404 });
}
