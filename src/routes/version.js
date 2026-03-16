// Version endpoint
export async function handleVersion() {
    return Response.json({ version: '2.1.0-debug' });
}
