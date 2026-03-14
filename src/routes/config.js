// Config endpoint
export async function handleConfig(request, env) {
    return Response.json({
        supabaseUrl: env.SUPABASE_URL || '',
        supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
    });
}
