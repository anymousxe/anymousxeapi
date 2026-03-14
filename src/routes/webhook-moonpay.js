// MoonPay webhook handler
import { createClient } from '@supabase/supabase-js';
import { PLANS } from '../../lib/models.js';

export async function handleMoonpayWebhook(request, env) {
    // Verify HMAC signature
    const signature = request.headers.get('moonpay-signature-v2') || request.headers.get('x-moonpay-signature');
    if (!signature || !env.MOONPAY_WEBHOOK_SECRET) {
        return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const rawBody = await request.text();

    // Verify HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(env.MOONPAY_WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const computedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));

    if (computedSig !== signature) {
        return Response.json({ error: 'invalid signature' }, { status: 401 });
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 });
    }

    const { type, data } = payload;
    if (!data || !data.id) {
        return Response.json({ error: 'missing data' }, { status: 400 });
    }

    const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    // Idempotency check
    const { data: existing } = await sb
        .from('moonpay_transactions')
        .select('id')
        .eq('moonpay_id', data.id)
        .single();

    if (existing) {
        return Response.json({ ok: true, message: 'already processed' });
    }

    // Extract user ID from externalCustomerId metadata
    const userId = data.externalCustomerId;
    if (!userId) {
        return Response.json({ error: 'no user ID in transaction' }, { status: 400 });
    }

    const amountUsd = parseFloat(data.quoteCurrencyAmount || data.baseCurrencyAmount || 0);
    const planType = data.metadata?.plan || null; // 'plus', 'pro', or null for credit deposit

    // Store the transaction
    await sb.from('moonpay_transactions').insert([{
        user_id: userId,
        moonpay_id: data.id,
        type: type,
        amount_usd: amountUsd,
        status: data.status || type,
        plan: planType,
    }]);

    // Only process completed transactions
    if (type === 'transaction_completed' || data.status === 'completed') {
        if (planType && ['plus', 'pro'].includes(planType)) {
            // Plan upgrade
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const allowance = PLANS[planType]?.credit_allowance || 0;

            await sb.from('user_credits').upsert({
                user_id: userId,
                plan: planType,
                plan_expires_at: expiresAt,
                monthly_allowance: allowance,
                balance: allowance,
                last_refill_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

            // Log transaction
            await sb.from('credit_transactions').insert([{
                user_id: userId,
                amount: allowance,
                balance_after: allowance,
                type: 'deposit',
                model: null,
            }]);
        } else {
            // Credit deposit
            const { data: credits } = await sb
                .from('user_credits')
                .select('balance')
                .eq('user_id', userId)
                .single();

            const newBalance = (credits?.balance || 0) + amountUsd;

            await sb.from('user_credits').upsert({
                user_id: userId,
                balance: newBalance,
            }, { onConflict: 'user_id' });

            await sb.from('credit_transactions').insert([{
                user_id: userId,
                amount: amountUsd,
                balance_after: newBalance,
                type: 'deposit',
                model: null,
            }]);
        }
    }

    return Response.json({ ok: true });
}
