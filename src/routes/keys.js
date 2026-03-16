// API Key management endpoints
import { authenticate, getSupabase } from '../../lib/auth.js';

export async function handleKeys(request, env, path, method) {
    let user;
    try {
        user = await authenticate(request, env);
    } catch (err) {
        return Response.json({ error: { message: err.message } }, { status: err.status || 401 });
    }

    const sb = getSupabase(env);

    // GET /v1/keys — list user's keys
    if (method === 'GET' && path === '/v1/keys') {
        const { data, error } = await sb
            .from('user_api_keys')
            .select('id, key, label, active, created_at, last_used_at, request_count, rate_limit')
            .eq('user_id', user.userId)
            .order('created_at', { ascending: false });

        if (error) {
            return Response.json({ error: { message: 'failed to fetch keys' } }, { status: 500 });
        }

        return Response.json({ keys: data || [] });
    }

    // POST /v1/keys — create new key
    if (method === 'POST' && path === '/v1/keys') {
        let body = {};
        try { body = await request.json(); } catch {}

        const label = body.label || 'default';
        const key = 'any-' + generateKey(12);

        const { data, error } = await sb
            .from('user_api_keys')
            .insert([{
                user_id: user.userId,
                key,
                label,
                active: true,
                request_count: 0,
                rate_limit: body.rate_limit || 20,
            }])
            .select()
            .single();

        if (error) {
            return Response.json({ error: { message: 'failed to create key' } }, { status: 500 });
        }

        return Response.json({ key: data }, { status: 201 });
    }

    // DELETE /v1/keys/:id — deactivate key
    if (method === 'DELETE' && path.startsWith('/v1/keys/')) {
        const keyId = path.split('/v1/keys/')[1];
        if (!keyId) {
            return Response.json({ error: { message: 'key ID required' } }, { status: 400 });
        }

        const { error } = await sb
            .from('user_api_keys')
            .delete()
            .eq('id', keyId)
            .eq('user_id', user.userId);

        if (error) {
            return Response.json({ error: { message: 'failed to delete key' } }, { status: 500 });
        }

        return Response.json({ success: true });
    }

    // PATCH /v1/keys/:id — update key settings
    if (method === 'PATCH' && path.startsWith('/v1/keys/')) {
        const keyId = path.split('/v1/keys/')[1];
        if (!keyId) return Response.json({ error: { message: 'key ID required' } }, { status: 400 });

        let body = {};
        try { body = await request.json(); } catch {}

        const updates = {};
        if (body.label !== undefined) updates.label = body.label;
        if (body.rate_limit !== undefined) {
            const rl = parseInt(body.rate_limit);
            if (isNaN(rl) || rl < 20 || rl > 120) {
                return Response.json({ error: { message: 'rate_limit must be between 20 and 120' } }, { status: 400 });
            }
            updates.rate_limit = rl;
        }

        if (Object.keys(updates).length === 0) {
            return Response.json({ error: { message: 'no updates provided' } }, { status: 400 });
        }

        const { data, error } = await sb
            .from('user_api_keys')
            .update(updates)
            .eq('id', keyId)
            .eq('user_id', user.userId)
            .select()
            .single();

        if (error) {
            return Response.json({ error: { message: 'failed to update key' } }, { status: 500 });
        }

        return Response.json({ key: data });
    }

    return Response.json({ error: { message: 'not found' } }, { status: 404 });
}

function generateKey(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
    }
    return result;
}
