// Auth: Send OTP code
import { createClient } from '@supabase/supabase-js';

export async function handleSendCode(request, env) {
    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 });
    }

    const { email } = body;
    if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

    try {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Store in Supabase
        const { error: dbError } = await supabase
            .from('otp_codes')
            .upsert({ email, code, expires_at: expiresAt, attempts: 0 }, { onConflict: 'email' });

        if (dbError) throw dbError;

        // Send via Resend
        const mailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'AnyLM <auth@anymouse.site>',
                to: email,
                subject: 'Verification Code: ' + code,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; color: #111;">
                        <h2>Verify your email</h2>
                        <p>Your verification code for AnyLM is:</p>
                        <div style="font-size: 32px; font-weight: bold; background: #f4f4f5; padding: 10px 20px; border-radius: 8px; display: inline-block;">
                            ${code}
                        </div>
                        <p style="margin-top: 20px; color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
                    </div>
                `,
            }),
        });

        if (!mailRes.ok) {
            const errText = await mailRes.text().catch(() => '');
            console.error('[send-code] Resend error:', errText);
            console.warn(`[send-code] DEV FALLBACK: OTP for ${email} is: ${code}`);
            
            // In dev environment or unverified domain, pretend success so user can proceed
            return Response.json({ 
                success: true, 
                message: 'Failed to send actual email. Code check server console.',
                _dev_code: code 
            });
        }

        return Response.json({ success: true, message: 'Code sent' });
    } catch (err) {
        console.error('[send-code] Error:', err);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
