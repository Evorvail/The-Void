const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
// Increase limit for image uploads
const io = new Server(server, { maxHttpBufferSize: 5e6 }); // 5MB limit

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

// THE MEMORY BANKS
const users = new Map();
const sanctuaryHistory = []; 

const gatekeeperQuestions = [
    "Interesting. Tell me, what's a hill you're willing to die on?",
    "If absolute anonymity usually brings out the worst in people, why are you seeking it out here?",
    "Final question: What does a meaningful life look like to you?"
];

io.on('connection', (socket) => {
    
    // REDDIT-STYLE LOGIN
    socket.on('login', (username) => {
        const cleanName = username.trim().substring(0, 15);
        
        if (users.has(cleanName)) {
            // Returning user
            const user = users.get(cleanName);
            user.socketId = socket.id;
            socket.emit('auth_success', { status: user.approved ? 'approved' : 'pending', username: cleanName });
            
            if (user.approved) {
                sanctuaryHistory.forEach(msg => socket.emit('sanctuary_message', msg));
            }
        } else {
            // New user
            users.set(cleanName, { socketId: socket.id, approved: false, stage: 0, totalScore: 0 });
            socket.emit('auth_success', { status: 'pending', username: cleanName });
            socket.emit('receive_message', { sender: 'Gatekeeper', text: "Welcome to the trial. Explain yourself. Who are you?", type: 'text' });
        }
    });

    socket.on('send_message', ({ username, message, type }) => {
        const user = users.get(username);
        if (!user) return;

        if (!user.approved) {
            // ECHO USER MESSAGE
            socket.emit('receive_message', { sender: 'You', text: message, type });
            
            // Only score text, not images
            if (type === 'text') {
                user.totalScore += message.length;
                if (message.toLowerCase().includes('respect') || message.toLowerCase().includes('truth')) {
                    user.totalScore += 20; 
                }
            }

            setTimeout(() => {
                if (user.stage < gatekeeperQuestions.length) {
                    socket.emit('receive_message', { sender: 'Gatekeeper', text: gatekeeperQuestions[user.stage], type: 'text' });
                    user.stage++;
                } else {
                    if (user.totalScore > 50) {
                        user.approved = true;
                        socket.emit('receive_message', { sender: 'Gatekeeper', text: "Vibe check passed. Welcome to the group chat.", type: 'text' });
                        socket.emit('auth_success', { status: 'approved', username });
                        
                        setTimeout(() => {
                            sanctuaryHistory.forEach(msg => socket.emit('sanctuary_message', msg));
                        }, 500);
                    } else {
                        user.stage = 0; 
                        user.totalScore = 0;
                        socket.emit('receive_message', { sender: 'Gatekeeper', text: "Not deep enough. Let's try again. Who are you really?", type: 'text' });
                    }
                }
            }, 1000);

        } else {
            // MAIN SANCTUARY CHAT
            const chatObj = { sender: username, text: message, type };
            sanctuaryHistory.push(chatObj);
            if (sanctuaryHistory.length > 100) sanctuaryHistory.shift(); 
            
            io.emit('sanctuary_message', chatObj);
        }
    });
});

server.listen(PORT, () => {
    console.log(`The Void is alive on port ${PORT}`);
});
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
