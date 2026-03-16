// credits.js — credit calculation and deduction for Cloudflare Workers

import { MODELS, isFreeModel } from './models.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Calculate cost for a request based on token usage
 * @param {string} modelId - The model ID
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Cost in USD
 */
export function calculateCost(modelId, inputTokens, outputTokens, multiplier = 1.0) {
    const model = MODELS[modelId];
    if (!model) return 0;

    // Image models use per-image pricing
    if (model.pricing.per_image) {
        return model.pricing.per_image * multiplier;
    }

    // Chat models use per-1M-token pricing
    const inputCost = (inputTokens / 1_000_000) * (model.pricing.input || 0);
    const outputCost = (outputTokens / 1_000_000) * (model.pricing.output || 0);
    return (inputCost + outputCost) * multiplier;
}

/**
 * Check if user has sufficient credits for a paid model
 * Returns true if model is free or user has balance > 0
 */
export function canAfford(modelId, balance, isApi = false) {
    if (isFreeModel(modelId, isApi)) return true;
    return balance > 0;
}

/**
 * Deduct credits from user's balance
 * Uses Supabase RPC for atomic deduction
 */
export async function deductCredits(env, userId, amount, modelId, inputTokens, outputTokens, apiKeyId) {
    if (amount <= 0) return;

    console.log(`[credits] DEDUCTING $${amount.toFixed(6)} from user=${userId} model=${modelId} in=${inputTokens} out=${outputTokens}`);

    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.supabase_service_role_key || env.supabase_service_key;
    const sb = createClient(env.SUPABASE_URL, key);

    // Atomic deduction via RPC
    const { data, error } = await sb.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: amount,
    });

    if (error) {
        console.error('[credits] deduction RPC failed:', error.message);
        return;
    }

    console.log(`[credits] deduction success, new balance: ${data}`);

    // Log the transaction (api_key_id not in schema, omit it)
    const { error: txError } = await sb.from('credit_transactions').insert([{
        user_id: userId,
        amount: -amount,
        balance_after: data ?? 0,
        type: 'usage',
        model: modelId,
        tokens_in: inputTokens,
        tokens_out: outputTokens,
    }]);

    if (txError) {
        console.error('[credits] transaction log failed:', txError.message);
    }
}

/**
 * Get user's credit balance
 */
export async function getBalance(env, userId) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.supabase_service_role_key || env.supabase_service_key;
    const sb = createClient(env.SUPABASE_URL, key);
    let { data } = await sb
        .from('user_credits')
        .select('balance, plan, plan_expires_at, monthly_allowance, last_refill_at')
        .eq('user_id', userId)
        .single();
    
    if (data) {
        data = await checkAndRefillCredits(env, userId, data);
    }
    return data;
}

/**
 * Check if user is due for a monthly credit refill based on their plan
 */
async function checkAndRefillCredits(env, userId, creditData) {
    const { plan, last_refill_at, balance } = creditData;
    if (plan === 'free' || plan === 'admin') return creditData;

    const lastRefill = last_refill_at ? new Date(last_refill_at) : new Date(0);
    const now = new Date();
    
    // Check if it's a new month (simple check: 30 days or different month index)
    const isNewMonth = (now.getMonth() !== lastRefill.getMonth()) || (now.getFullYear() !== lastRefill.getFullYear());

    if (isNewMonth) {
        let allowance = 0;
        if (plan === 'plus') allowance = 2.00;
        else if (plan === 'pro') allowance = 10.00;

        if (allowance > 0) {
            const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.supabase_service_role_key || env.supabase_service_key;
            const sb = createClient(env.SUPABASE_URL, key);
            
            const newBalance = Number(balance) + allowance;
            const { data: updated } = await sb
                .from('user_credits')
                .update({ 
                    balance: newBalance, 
                    last_refill_at: now.toISOString(),
                    monthly_allowance: allowance 
                })
                .eq('user_id', userId)
                .select()
                .single();
            
            if (updated) {
                // Log transaction
                await sb.from('credit_transactions').insert([{
                    user_id: userId,
                    amount: allowance,
                    balance_after: newBalance,
                    type: 'refill',
                    model: 'PLAN_BONUS'
                }]);
                return updated;
            }
        }
    }
    return creditData;
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
