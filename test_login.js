const fetch = require('node-fetch');

async function testLogin(username, password) {
    const url = 'http://localhost:5000/api/login';
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        console.log(`LOGIN TEST [${username}]:`, res.status, data);
    } catch (err) {
        console.error(`LOGIN TEST [${username}] ERROR:`, err.message);
    }
}

async function run() {
    await testLogin('Deva', 'Deva123');
    await testLogin('employee', 'emp123');
}

run();
