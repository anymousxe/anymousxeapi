async function listModels() {
    const k = 'f66f4aae98a384e037412ce6f11ecae9a5ad2901595f9d6f08e0bd06291118ca';
    try {
        const res = await fetch('https://api.literouter.com/v1/models', {
            headers: { 'Authorization': `Bearer ${k}` }
        });
        const data = await res.json();
        console.log('Available models:', data.data.map(m => m.id).join(', '));
    } catch(e) {
        console.error('Error:', e);
    }
}
listModels();
