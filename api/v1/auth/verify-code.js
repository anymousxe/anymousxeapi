const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

    try {
        const { data: record, error } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !record) return res.status(400).json({ error: 'No code found for this email' });

        // Check expiry
        if (new Date() > new Date(record.expires_at)) {
            return res.status(400).json({ error: 'Code expired' });
        }

        // Check attempts
        if (record.attempts >= 5) {
            return res.status(400).json({ error: 'Too many attempts' });
        }

        // Verify
        if (record.code !== code) {
            await supabase.from('otp_codes').update({ attempts: record.attempts + 1 }).eq('email', email);
            return res.status(400).json({ error: 'Invalid code' });
        }

        // SUCCESS - delete used code
        await supabase.from('otp_codes').delete().eq('email', email);

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('[verify-code] Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
