// Admin endpoints (admin-only access)
import { authenticate } from '../../lib/auth.js';
import { createClient } from '@supabase/supabase-js';

export async function handleAdmin(request, env, path, method) {
    let user;
    try {
        user = await authenticate(request, env);
    } catch (err) {
        return Response.json({ error: { message: err.message } }, { status: err.status || 401 });
    }

    if (!user.isAdmin) {
        return Response.json({ error: { message: 'admin access required' } }, { status: 403 });
    }

    const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    // POST /v1/admin/add-credits — add credits to user
    if (path === '/v1/admin/add-credits' && method === 'POST') {
        let body;
        try { body = await request.json(); } catch {
            return Response.json({ error: { message: 'invalid JSON' } }, { status: 400 });
        }

        const { email, amount } = body;
        if (!email || !amount || amount <= 0) {
            return Response.json({ error: { message: 'email and positive amount required' } }, { status: 400 });
        }

        // Find user by email
        const { data: userData } = await sb.auth.admin.listUsers();
        const targetUser = userData?.users?.find(u => u.email === email);
        if (!targetUser) {
            return Response.json({ error: { message: 'user not found' } }, { status: 404 });
        }

        // Upsert credits
        const { data: existing } = await sb
            .from('user_credits')
            .select('balance')
            .eq('user_id', targetUser.id)
            .single();

        const newBalance = (existing?.balance || 0) + amount;

        await sb.from('user_credits').upsert({
            user_id: targetUser.id,
            balance: newBalance,
        }, { onConflict: 'user_id' });

        // Log transaction
        await sb.from('credit_transactions').insert([{
            user_id: targetUser.id,
            amount: amount,
            balance_after: newBalance,
            type: 'admin_grant',
            model: null,
            tokens_in: 0,
            tokens_out: 0,
        }]);

        return Response.json({ success: true, email, new_balance: newBalance });
    }

    // GET /v1/admin/users — list all users with plans/balances
    if (path === '/v1/admin/users' && method === 'GET') {
        const { data: credits } = await sb
            .from('user_credits')
            .select('user_id, balance, plan, plan_expires_at, monthly_allowance');

        // Get user emails
        const { data: userData } = await sb.auth.admin.listUsers();
        const userMap = {};
        if (userData?.users) {
            for (const u of userData.users) {
                userMap[u.id] = { email: u.email, username: u.user_metadata?.username || '' };
            }
        }

        const users = (credits || []).map(c => ({
            user_id: c.user_id,
            email: userMap[c.user_id]?.email || 'unknown',
            username: userMap[c.user_id]?.username || '',
            balance: c.balance,
            plan: c.plan,
            plan_expires_at: c.plan_expires_at,
            monthly_allowance: c.monthly_allowance,
        }));

        return Response.json({ users });
    }

    // POST /v1/admin/set-plan — change user's plan
    if (path === '/v1/admin/set-plan' && method === 'POST') {
        let body;
        try { body = await request.json(); } catch {
            return Response.json({ error: { message: 'invalid JSON' } }, { status: 400 });
        }

        const { email, plan } = body;
        if (!email || !['free', 'plus', 'pro'].includes(plan)) {
            return Response.json({ error: { message: 'email and valid plan required (free/plus/pro)' } }, { status: 400 });
        }

        const { data: userData } = await sb.auth.admin.listUsers();
        const targetUser = userData?.users?.find(u => u.email === email);
        if (!targetUser) {
            return Response.json({ error: { message: 'user not found' } }, { status: 404 });
        }

        const expiresAt = plan !== 'free'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null;

        await sb.from('user_credits').upsert({
            user_id: targetUser.id,
            plan,
            plan_expires_at: expiresAt,
        }, { onConflict: 'user_id' });

        return Response.json({ success: true, email, plan, plan_expires_at: expiresAt });
    }

    return Response.json({ error: { message: 'not found' } }, { status: 404 });
}
