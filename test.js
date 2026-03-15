async function test() {
    const k = ''; // Add your key here for testing
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
