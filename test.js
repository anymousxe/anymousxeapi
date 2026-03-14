async function test() {
    const k = 'f66f4aae98a384e037412ce6f11ecae9a5ad2901595f9d6f08e0bd06291118ca';
    try {
        const res = await fetch('https://api.literouter.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${k}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{role: 'user', content: 'hello'}]
            })
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch(e) {
        console.error('Fetch error:', e);
    }
}
test();
