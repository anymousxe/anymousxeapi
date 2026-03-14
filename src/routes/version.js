// Version endpoint
export async function handleVersion() {
    return Response.json({ version: '2.0.0' });
}
