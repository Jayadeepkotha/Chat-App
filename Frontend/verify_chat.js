
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

const clientA = io(SOCKET_URL, { auth: { deviceId: 'TEST_USER_A' } });
const clientB = io(SOCKET_URL, { auth: { deviceId: 'TEST_USER_B' } });

// LISTEN FOR ERRORS
[clientA, clientB].forEach((s, i) => {
    const name = i === 0 ? 'A' : 'B';
    s.on('connect_error', (err) => console.log(`[${name}] Connect Error: ${err.message}`));
    s.on('queue:error', (msg) => console.log(`[${name}] Queue Error: ${msg}`));
    s.on('disconnect', () => console.log(`[${name}] Disconnected`));
});

console.log('--- Starting Enhanced Chat Verification ---');

// Setup Client A
clientA.on('connect', () => {
    console.log('[A] Connected. Entering Queue -> Gender: male');
    clientA.emit('queue:enter', { preference: 'any', gender: 'male' });
});

clientA.on('match:found', (data) => {
    console.log('[A] Match Found! Room:', data.roomId);
    setTimeout(() => {
        clientA.emit('chat:message', { roomId: data.roomId, text: 'Hello from A!' });
    }, 500);
});

// Setup Client B
clientB.on('connect', () => {
    console.log('[B] Connected. Entering Queue -> Gender: female');
    clientB.emit('queue:enter', { preference: 'any', gender: 'female' });
});

clientB.on('match:found', (data) => {
    console.log('[B] Match Found! Room:', data.roomId);
});

clientB.on('chat:message', (data) => {
    console.log(`[B] RECEIVED: "${data.text}"`);
    console.log('✅ SUCCESS');
    process.exit(0);
});
