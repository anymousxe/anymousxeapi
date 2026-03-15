// credits.js — credit calculation and deduction for Cloudflare Workers

import { MODELS } from './models.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Calculate cost for a request based on token usage
 * @param {string} modelId - The model ID
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Cost in USD
 */
export function calculateCost(modelId, inputTokens, outputTokens) {
    const model = MODELS[modelId];
    if (!model) return 0;

    // Image models use per-image pricing
    if (model.pricing.per_image) {
        return model.pricing.per_image;
    }

    // Chat models use per-1M-token pricing
    const inputCost = (inputTokens / 1_000_000) * (model.pricing.input || 0);
    const outputCost = (outputTokens / 1_000_000) * (model.pricing.output || 0);
    return inputCost + outputCost;
}

/**
 * Check if a model is free (no credit deduction needed)
 */
export function isFreeModel(modelId) {
    const model = MODELS[modelId];
    if (!model) return false;
    if (model.pricing.per_image) return false;
    return model.pricing.input === 0 && model.pricing.output === 0;
}

/**
 * Check if user has sufficient credits for a paid model
 * Returns true if model is free or user has balance > 0
 */
export function canAfford(modelId, balance) {
    if (isFreeModel(modelId)) return true;
    return balance > 0;
}

/**
 * Deduct credits from user's balance
 * Uses Supabase RPC for atomic deduction
 */
export async function deductCredits(env, userId, amount, modelId, inputTokens, outputTokens, apiKeyId) {
    if (amount <= 0) return;

    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.supabase_service_role_key || env.supabase_service_key;
    const sb = createClient(env.SUPABASE_URL, key);

    // Atomic deduction via RPC
    const { data, error } = await sb.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: amount,
    });

    if (error) {
        console.error('[credits] deduction failed:', error.message);
        return;
    }

    // Log the transaction
    await sb.from('credit_transactions').insert([{
        user_id: userId,
        amount: -amount,
        balance_after: data ?? 0,
        type: 'usage',
        model: modelId,
        tokens_in: inputTokens,
        tokens_out: outputTokens,
        api_key_id: apiKeyId,
    }]);
}

/**
 * Get user's credit balance
 */
export async function getBalance(env, userId) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.supabase_service_role_key || env.supabase_service_key;
    const sb = createClient(env.SUPABASE_URL, key);
    const { data } = await sb
        .from('user_credits')
        .select('balance, plan, plan_expires_at, monthly_allowance, last_refill_at')
        .eq('user_id', userId)
        .single();
    return data;
}

/**
 * Get recent transactions for a user
 */
export async function getTransactions(env, userId, limit = 50) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.supabase_service_role_key || env.supabase_service_key;
    const sb = createClient(env.SUPABASE_URL, key);
    const { data } = await sb
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    return data || [];
}

/**
 * Get usage stats grouped by model and day
 */
export async function getUsageStats(env, userId, days = 30) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.supabase_service_role_key || env.supabase_service_key;
    const sb = createClient(env.SUPABASE_URL, key);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await sb
        .from('credit_transactions')
        .select('model, amount, tokens_in, tokens_out, created_at')
        .eq('user_id', userId)
        .eq('type', 'usage')
        .gte('created_at', since)
        .order('created_at', { ascending: false });

    return data || [];
}
