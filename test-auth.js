async function test() {
    try {
        const res = await fetch('http://localhost:8787/v1/auth/send-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'testuser@gmail.com'
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
