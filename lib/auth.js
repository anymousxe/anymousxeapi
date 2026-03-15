// auth.js — unified auth handler for Cloudflare Workers
// Supports both `any-` API keys (from user_api_keys table) and Supabase session tokens

import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['anymousxe.info@gmail.com'];
const ADMIN_USERNAMES = ['anymousxe'];

function getSupabase(env) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.supabase_service_role_key || env.supabase_service_key;
    return createClient(env.SUPABASE_URL, key);
}

function getSupabaseAnon(env) {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

/**
 * Authenticate a request and return user info
 * @returns {{ userId, email, plan, isAdmin, apiKeyId }} or throws
 */
export async function authenticate(request, env) {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
        throw { status: 401, message: 'missing api key' };
    }

    // Check if it's a custom API key (any-xxxx format)
    if (token.startsWith('any-')) {
        return await authenticateApiKey(token, env);
    }

    // Otherwise treat as Supabase session token
    return await authenticateSupabase(token, env);
}

async function authenticateApiKey(key, env) {
    const sb = getSupabase(env);

    const { data: keyData, error } = await sb
        .from('user_api_keys')
        .select('id, user_id, active')
        .eq('key', key)
        .single();

    if (error || !keyData || !keyData.active) {
        throw { status: 401, message: 'invalid api key' };
    }

    // Update last_used_at and increment request_count
    sb.from('user_api_keys')
        .update({ last_used_at: new Date().toISOString(), request_count: keyData.request_count + 1 })
        .eq('id', keyData.id)
        .then(() => {});

    // Get user's plan from user_credits
    const { data: credits } = await sb
        .from('user_credits')
        .select('plan, balance, plan_expires_at')
        .eq('user_id', keyData.user_id)
        .single();

    // Get user email for admin check
    const { data: userData } = await sb.auth.admin.getUserById(keyData.user_id);
    const email = userData?.user?.email || '';
    const username = userData?.user?.user_metadata?.username || '';
    const isAdmin = ADMIN_EMAILS.includes(email) || ADMIN_USERNAMES.includes(username);

    let plan = credits?.plan || 'free';
    if (isAdmin) plan = 'admin';

    // Check if plan is expired
    if (credits?.plan_expires_at && new Date(credits.plan_expires_at) < new Date() && !isAdmin) {
        plan = 'free';
    }

    return {
        userId: keyData.user_id,
        email,
        plan,
        isAdmin,
        apiKeyId: keyData.id,
        balance: credits?.balance ?? 0,
    };
}

async function authenticateSupabase(token, env) {
    const sbAnon = getSupabaseAnon(env);

    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': env.SUPABASE_ANON_KEY,
        },
    });

    if (!res.ok) {
        throw { status: 401, message: 'invalid session' };
    }

    const user = await res.json();
    const email = user.email || '';
    const username = user.user_metadata?.username || '';
    const isAdmin = ADMIN_EMAILS.includes(email) || ADMIN_USERNAMES.includes(username);

    // Get plan from user_credits
    const sb = getSupabase(env);
    const { data: credits } = await sb
        .from('user_credits')
        .select('plan, balance, plan_expires_at')
        .eq('user_id', user.id)
        .single();

    let plan = credits?.plan || 'free';
    if (isAdmin) plan = 'admin';

    // Check plan expiry
    if (credits?.plan_expires_at && new Date(credits.plan_expires_at) < new Date() && !isAdmin) {
        plan = 'free';
    }

    return {
        userId: user.id,
        email,
        plan,
        isAdmin,
        apiKeyId: null,
        balance: credits?.balance ?? 0,
    };
}

export function isAdmin(email, username) {
    return ADMIN_EMAILS.includes(email) || ADMIN_USERNAMES.includes(username);
}
