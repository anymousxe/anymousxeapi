// Auth: Verify OTP code
import { createClient } from '@supabase/supabase-js';

export async function handleVerifyCode(request, env) {
    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 });
    }

    const { email, code } = body;
    if (!email || !code) return Response.json({ error: 'Email and code required' }, { status: 400 });

    try {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

        const { data: record, error } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !record) {
            return Response.json({ error: 'No code found for this email' }, { status: 400 });
        }

        if (new Date() > new Date(record.expires_at)) {
            return Response.json({ error: 'Code expired' }, { status: 400 });
        }

        if (record.attempts >= 5) {
            return Response.json({ error: 'Too many attempts' }, { status: 400 });
        }

        if (record.code !== code) {
            await supabase.from('otp_codes').update({ attempts: record.attempts + 1 }).eq('email', email);
            return Response.json({ error: 'Invalid code' }, { status: 400 });
        }

        // Success — delete used code
        await supabase.from('otp_codes').delete().eq('email', email);

        return Response.json({ success: true });
    } catch (err) {
        console.error('[verify-code] Error:', err);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
