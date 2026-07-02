
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// In-memory active users (For production, you'd use a DB like MongoDB/Postgres)
const users = new Map();

io.on('connection', (socket) => {
    // 1. Generate a totally anonymous cryptographic key for new users
    socket.on('request_identity', () => {
        const privateKey = crypto.randomBytes(16).toString('hex');
        users.set(privateKey, { socketId: socket.id, approved: false });
        socket.emit('identity_generated', privateKey);
    });

    // 2. Re-login using their saved private key
    socket.on('auth_with_key', (key) => {
        if (users.has(key)) {
            users.get(key).socketId = socket.id;
            const status = users.get(key).approved ? 'approved' : 'pending';
            socket.emit('auth_success', { status });
        } else {
            // New key setup if they paste a random one
            users.set(key, { socketId: socket.id, approved: false });
            socket.emit('auth_success', { status: 'pending' });
        }
    });

    // 3. Handle incoming chat messages
    socket.on('send_message', ({ key, message }) => {
        const user = users.get(key);
        if (!user) return;

        if (!user.approved) {
            // --- THE TRIAL (Interview Phase) ---
            // Send the applicant's message to the gatekeeper system
            socket.emit('receive_message', { sender: 'You', text: message });

            // Simulate the Gatekeeper Admin Bot reacting to their vibe
            setTimeout(() => {
                let botReply = "Interesting choice of words. Tell me, how do you handle someone completely destroying your argument without losing your mind?";
                
                if (message.toLowerCase().includes('respect') || message.length > 50) {
                    user.approved = true;
                    socket.emit('receive_message', { sender: 'GATEKEEPER', text: "Vibe check passed. Welcome to the Sanctuary. You have been approved." });
                    socket.emit('auth_success', { status: 'approved' });
                } else {
                    socket.emit('receive_message', { sender: 'GATEKEEPER', text: botReply });
                }
            }, 1500);

        } else {
            // --- THE SANCTUARY (Main Chat) ---
            // Broadcast anonymously to everyone else who passed the test
            const truncatedKey = `Anon_${key.substring(0, 6)}`;
            io.emit('sanctuary_message', { sender: truncatedKey, text: message });
        }
    });

    socket.on('disconnect', () => {
        // Keeps user state persistent in the map so they don't lose progress on disconnect
    });
});

server.listen(PORT, () => {
    console.log(`The Void is alive on port ${PORT}`);
});
