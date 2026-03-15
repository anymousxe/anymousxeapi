// Config endpoint — returns Supabase public config for frontend
export async function handleConfig(request, env) {
    const dotEnv = env['.env'] || env['env'] || env['ENV'] || '';
    
    let sUrl = env.SUPABASE_URL;
    let sKey = env.SUPABASE_ANON_KEY;
    
    // Explicitly check for lowercase variants too just in case
    if (!sUrl) sUrl = env.supabase_url;
    if (!sKey) sKey = env.supabase_anon_key;

    // Robust .env parsing fallback
    if (dotEnv && typeof dotEnv === 'string') {
        const lines = dotEnv.split('\n');
        for (let l of lines) {
            const trimmed = l.trim();
            if (trimmed.startsWith('SUPABASE_URL=')) {
                sUrl = trimmed.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
            }
            if (trimmed.startsWith('SUPABASE_ANON_KEY=')) {
                sKey = trimmed.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
            }
        }
    }

    if (!sUrl || !sKey) {
        console.error('[config] Missing Supabase config. URL:', !!sUrl, 'Key:', !!sKey);
    }

    return Response.json({
        supabaseUrl: sUrl || '',
        supabaseAnonKey: sKey || '',
    });
}
