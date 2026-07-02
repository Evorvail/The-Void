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

// THE MEMORY BANKS
const users = new Map();
const sanctuaryHistory = []; // <-- NEW: Stores the global chat history

const gatekeeperQuestions = [
    "Interesting. Tell me, what's a hill you're willing to die on?",
    "If absolute anonymity usually brings out the worst in people, why are you seeking it out here?",
    "Final question: What does a meaningful life look like to you in a world driven by superficial metrics?"
];

io.on('connection', (socket) => {
    socket.on('request_identity', () => {
        const privateKey = crypto.randomBytes(16).toString('hex');
        users.set(privateKey, { socketId: socket.id, approved: false, stage: 0, totalScore: 0 });
        socket.emit('identity_generated', privateKey);
    });

    socket.on('auth_with_key', (key) => {
        if (users.has(key)) {
            users.get(key).socketId = socket.id;
            const status = users.get(key).approved ? 'approved' : 'pending';
            socket.emit('auth_success', { status });
            
            // NEW: If they log back in and are approved, dump the chat history so it doesn't look dead
            if (status === 'approved') {
                sanctuaryHistory.forEach(msg => {
                    socket.emit('sanctuary_message', msg);
                });
            }
        } else {
            users.set(key, { socketId: socket.id, approved: false, stage: 0, totalScore: 0 });
            socket.emit('auth_success', { status: 'pending' });
        }
    });

    socket.on('send_message', ({ key, message }) => {
        const user = users.get(key);
        if (!user) return;

        if (!user.approved) {
            // ECHO USER MESSAGE
            socket.emit('receive_message', { sender: 'You', text: message });
            
            // SCORING
            user.totalScore += message.length;
            if (message.toLowerCase().includes('respect') || message.toLowerCase().includes('truth')) {
                user.totalScore += 20; 
            }

            setTimeout(() => {
                if (user.stage < gatekeeperQuestions.length) {
                    let botReply = gatekeeperQuestions[user.stage];
                    socket.emit('receive_message', { sender: 'GATEKEEPER', text: botReply });
                    user.stage++;
                } else {
                    if (user.totalScore > 80) {
                        user.approved = true;
                        socket.emit('receive_message', { sender: 'GATEKEEPER', text: "[APPROVE] Vibe check passed. Your words carry weight. Welcome to the Sanctuary." });
                        socket.emit('auth_success', { status: 'approved' });
                        
                        // NEW: Dump history when they first get approved
                        setTimeout(() => {
                            sanctuaryHistory.forEach(msg => {
                                socket.emit('sanctuary_message', msg);
                            });
                        }, 500);

                    } else {
                        user.stage = 0; 
                        user.totalScore = 0;
                        socket.emit('receive_message', { sender: 'GATEKEEPER', text: "[REJECT] Your answers lack depth. Let's try this again from the top. Who are you?" });
                    }
                }
            }, 1500);

        } else {
            // MAIN SANCTUARY CHAT
            const truncatedKey = `Anon_${key.substring(0, 6)}`;
            const chatObj = { sender: truncatedKey, text: message };
            
            // NEW: Save to history and keep max 100 messages
            sanctuaryHistory.push(chatObj);
            if (sanctuaryHistory.length > 100) sanctuaryHistory.shift(); 
            
            io.emit('sanctuary_message', chatObj);
        }
    });
});

server.listen(PORT, () => {
    console.log(`The Void is alive on port ${PORT}`);
});
        } else {
            users.set(key, { socketId: socket.id, approved: false, stage: 0, totalScore: 0 });
            socket.emit('auth_success', { status: 'pending' });
        }
    });

    socket.on('send_message', ({ key, message }) => {
        const user = users.get(key);
        if (!user) return;

        if (!user.approved) {
            // Echo user message to UI
            socket.emit('receive_message', { sender: 'You', text: message });

            // Add points to their score based on message length and keywords
            user.totalScore += message.length;
            if (message.toLowerCase().includes('respect') || message.toLowerCase().includes('truth')) {
                user.totalScore += 20; 
            }

            setTimeout(() => {
                // If they haven't answered all questions yet...
                if (user.stage < gatekeeperQuestions.length) {
                    let botReply = gatekeeperQuestions[user.stage];
                    socket.emit('receive_message', { sender: 'GATEKEEPER', text: botReply });
                    user.stage++;
                } 
                // If the interview is over, make a decision
                else {
                    if (user.totalScore > 80) {
                        user.approved = true;
                        socket.emit('receive_message', { sender: 'GATEKEEPER', text: "[APPROVE] Vibe check passed. Your words carry weight. Welcome to the Sanctuary." });
                        socket.emit('auth_success', { status: 'approved' });
                    } else {
                        // Reset them if they gave short/lazy answers
                        user.stage = 0; 
                        user.totalScore = 0;
                        socket.emit('receive_message', { sender: 'GATEKEEPER', text: "[REJECT] Your answers lack depth. Let's try this again from the top. Who are you?" });
                    }
                }
            }, 1500);

        } else {
            // Main Sanctuary Chat Room logic
            const truncatedKey = `Anon_${key.substring(0, 6)}`;
            io.emit('sanctuary_message', { sender: truncatedKey, text: message });
        }
    });
});

server.listen(PORT, () => {
    console.log(`The Void is alive on port ${PORT}`);
});
