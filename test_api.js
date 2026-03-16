
import fs from 'fs';

async function test() {
  const body = {
    model: "gemini-3.1-flash-lite-preview-thinking",
    messages: [
      {
        role: "user",
        content: "hi"
      }
    ]
  };

  try {
    const res = await fetch('http://127.0.0.1:8788/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer any-5u5dfjra19sn'
      },
      body: JSON.stringify(body)
    });

    console.log('Status:', res.status);
    const data = await res.json();
    fs.writeFileSync('debug_output.json', JSON.stringify({ status: res.status, data }, null, 2));
    console.log('Response saved to debug_output.json');
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

test();
