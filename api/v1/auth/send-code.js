const { createClient } = require('@supabase/supabase-js');
const resend = require('resend');

// Use service key for backend writes to otp_codes table
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resendClient = new resend.Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        // 1. Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        // 2. Store in Supabase (overwrites existing for same email)
        const { error: dbError } = await supabase
            .from('otp_codes')
            .upsert({ email, code, expires_at: expiresAt, attempts: 0 }, { onConflict: 'email' });

        if (dbError) throw dbError;

        // 3. Send via Resend
        const { data, error: mailError } = await resendClient.emails.send({
            from: 'AnymousxeAPI <auth@anymouse.site>',
            to: email,
            subject: 'Verification Code: ' + code,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #111;">
                    <h2>Verify your email</h2>
                    <p>Your verification code for AnymousxeAPI is:</p>
                    <div style="font-size: 32px; font-weight: bold; background: #f4f4f5; padding: 10px 20px; border-radius: 8px; display: inline-block;">
                        ${code}
                    </div>
                    <p style="margin-top: 20px; color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
                </div>
            `
        });

        if (mailError) return res.status(500).json({ error: 'Failed to send email' });

        return res.status(200).json({ success: true, message: 'Code sent' });
    } catch (err) {
        console.error('[send-code] Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
