// Admin endpoints (admin-only access)
import { authenticate, getSupabase } from '../../lib/auth.js';

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

    const sb = getSupabase(env);
    
    // GET /v1/admin/check — check if user is admin
    if (path === '/v1/admin/check' && method === 'GET') {
        return Response.json({ admin: user.isAdmin });
    }
    if (path === '/v1/admin/add-credits' && method === 'POST') {
        let body;
        try { body = await request.json(); } catch {
            return Response.json({ error: { message: 'invalid JSON' } }, { status: 400 });
        }

        const { email, username, amount } = body;
        const identifier = email || username;
        if (!identifier || !amount || amount <= 0) {
            return Response.json({ error: { message: 'identifier and positive amount required' } }, { status: 400 });
        }

        // Optimized lookup using public users table (Case-insensitive for username)
        const query = email 
            ? sb.from('users').select('id, email').eq('email', email) 
            : sb.from('users').select('id, email').ilike('username', username);
        const { data: targetUser, error: queryError } = await query.maybeSingle();

        if (queryError || !targetUser) {
            return Response.json({ error: { message: `user not found. DB Error: ${queryError?.message || 'none'}` } }, { status: 404 });
        }

        // Upsert credits
        const { data: existing, error: existingError } = await sb
            .from('user_credits')
            .select('balance')
            .eq('user_id', targetUser.id)
            .single();

        if (existingError && existingError.code !== 'PGRST116') { // Ignore "No rows found"
            return Response.json({ error: { message: `Failed to fetch existing credits: ${existingError.message}` } }, { status: 500 });
        }

        const newBalance = (existing?.balance || 0) + amount;

        const { error: upsertError } = await sb.from('user_credits').upsert({
            user_id: targetUser.id,
            balance: newBalance,
        }, { onConflict: 'user_id' });

        if (upsertError) {
            return Response.json({ error: { message: `Failed to upsert credits: ${upsertError.message}` } }, { status: 500 });
        }

        // Log transaction
        const { error: logError } = await sb.from('credit_transactions').insert([{
            user_id: targetUser.id,
            amount: amount,
            balance_after: newBalance,
            type: 'admin_grant',
        }]);

        if (logError) {
             return Response.json({ error: { message: `Failed to log transaction: ${logError.message}` } }, { status: 500 });
        }

        return Response.json({ success: true, email: targetUser.email, new_balance: newBalance });
    }

    // GET /v1/admin/users — list all users with plans/balances
    if (path === '/v1/admin/users' && method === 'GET') {
        const { data: users } = await sb
            .from('users')
            .select(`
                id, email, username, plan,
                user_credits ( balance, plan_expires_at, monthly_allowance )
            `);

        const formatted = (users || []).map(u => ({
            user_id: u.id,
            email: u.email,
            username: u.username,
            plan: u.plan,
            balance: u.user_credits?.balance || 0,
            plan_expires_at: u.user_credits?.plan_expires_at,
            monthly_allowance: u.user_credits?.monthly_allowance,
        }));

        return Response.json({ users: formatted });
    }

    // POST /v1/admin/set-plan — change user's plan
    if (path === '/v1/admin/set-plan' && method === 'POST') {
        let body;
        try { body = await request.json(); } catch {
            return Response.json({ error: { message: 'invalid JSON' } }, { status: 400 });
        }

        const { email, username, plan } = body;
        const identifier = email || username;
        if (!identifier || !['free', 'plus', 'pro', 'admin'].includes(plan)) {
            return Response.json({ error: { message: 'identifer and valid plan required' } }, { status: 400 });
        }

        // Optimized lookup
        const query = email ? sb.from('users').select('id, email').eq('email', email) : sb.from('users').select('id, email').eq('username', username);
        const { data: targetUser } = await query.maybeSingle();

        if (!targetUser) {
            return Response.json({ error: { message: 'user not found' } }, { status: 404 });
        }

        const expiresAt = plan !== 'free'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null;

        // Update BOTH tables
        await sb.from('users').update({ plan }).eq('id', targetUser.id);
        await sb.from('user_credits').upsert({
            user_id: targetUser.id,
            plan_expires_at: expiresAt,
            monthly_allowance: plan === 'pro' ? 100 : (plan === 'plus' ? 20 : 0)
        }, { onConflict: 'user_id' });

        return Response.json({ success: true, email: targetUser.email, plan, plan_expires_at: expiresAt });
    }

    return Response.json({ error: { message: 'not found' } }, { status: 404 });
}
