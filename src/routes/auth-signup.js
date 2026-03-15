import { createClient } from '@supabase/supabase-js';

export async function handleSignup(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { email, password, username } = await request.json();

        if (!email || !password) {
            return Response.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        // Create user via Admin API to auto-confirm
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username: username || email.split('@')[0] }
        });

        if (error) {
            return Response.json({ error: error.message }, { status: 400 });
        }

        return Response.json({ 
            message: 'User created and confirmed',
            user: data.user
        });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
