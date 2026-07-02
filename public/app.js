const socket = io();
let myUsername = null;

const loginView = document.getElementById('login-view');
const chatView = document.getElementById('chat-view');
const chatMessages = document.getElementById('chat-messages');
const msgInput = document.getElementById('msg-input');
const imageUpload = document.getElementById('image-upload');
const roomTitle = document.getElementById('room-title');
const roomStatus = document.getElementById('room-status');
const myUsernameDisplay = document.getElementById('my-username-display');

// 1. LOGIN LOGIC
document.getElementById('login-btn').addEventListener('click', attemptLogin);
document.getElementById('username-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptLogin();
});

function attemptLogin() {
    const rawName = document.getElementById('username-input').value.trim();
    if (!rawName) return;
    myUsername = rawName;
    socket.emit('login', myUsername);
}

socket.on('auth_success', ({ status, username }) => {
    loginView.classList.add('hidden');
    chatView.classList.remove('hidden');
    chatView.classList.add('flex'); // Keep it flex for the layout
    myUsernameDisplay.innerText = `@${username}`;
    
    if (status === 'approved') {
        roomTitle.innerText = "Global Sanctuary";
        roomStatus.innerText = "Anonymous Group Chat";
    }
});

// 2. SENDING MESSAGES & IMAGES
const sendMessage = (text, type = 'text') => {
    if (!myUsername) return;
    
    // Auto-detect if they pasted an image/gif URL
    if (type === 'text' && text.match(/\.(jpeg|jpg|gif|png)$/i) != null) {
        type = 'image';
    }

    socket.emit('send_message', { username: myUsername, message: text, type });
};

document.getElementById('send-btn').addEventListener('click', () => {
    if (msgInput.value.trim()) {
        sendMessage(msgInput.value.trim());
        msgInput.value = '';
    }
});

msgInput.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter' && msgInput.value.trim()) {
        sendMessage(msgInput.value.trim());
        msgInput.value = '';
    } 
});

// Handle local image uploads
imageUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        if (file.size > 5000000) {
            alert("File is too big! Keep it under 5MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            sendMessage(e.target.result, 'image');
        };
        reader.readAsDataURL(file);
    }
});

// 3. RECEIVING MESSAGES
socket.on('receive_message', ({ sender, text, type }) => {
    appendBubble(sender, text, type, sender === 'You');
});

socket.on('sanctuary_message', ({ sender, text, type }) => {
    appendBubble(sender, text, type, sender === myUsername);
});

// 4. RENDER WHATSAPP BUBBLES
function appendBubble(sender, content, type, isMe) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let mediaContent = '';
    if (type === 'image') {
        mediaContent = `<img src="${content}" class="rounded-lg max-w-full h-auto mb-1 max-h-64 object-contain">`;
    } else {
        mediaContent = `<p class="text-sm break-words">${content}</p>`;
    }

    wrapper.innerHTML = `
        <div class="max-w-[75%] px-3 py-2 flex flex-col relative shadow-sm ${isMe ? 'bubble-out text-white' : 'bubble-in text-gray-100'}">
            ${!isMe ? `<span class="text-xs font-bold text-[#53bdeb] mb-1">${sender}</span>` : ''}
            ${mediaContent}
            <span class="text-[10px] text-gray-400 self-end mt-1">${time}</span>
        </div>
    `;
    
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
socket.on('auth_success', ({ status }) => {
    entranceView.classList.add('hidden');
    chatView.classList.remove('hidden');
    
    if (status === 'approved') {
        statusTag.innerText = "VERIFIED RESIDENT";
        statusTag.className = "text-xs px-2 py-1 bg-emerald-950 text-emerald-400 border border-emerald-900 rounded";
        appendSystemMessage("SYSTEM: You are inside the Global Sanctuary room. All chats are live and anonymous.");
    } else {
        statusTag.innerText = "UNVERIFIED CANDIDATE";
        appendSystemMessage("GATEKEEPER: Your case is pending review. Continue your trial conversation below.");
    }
});

const sendMessage = () => {
    const text = msgInput.value.trim();
    if (!text || !myPrivateKey) return;
    socket.emit('send_message', { key: myPrivateKey, message: text });
    msgInput.value = '';
};

document.getElementById('send-btn').addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

socket.on('receive_message', ({ sender, text }) => {
    appendChatMessage(sender, text, sender === 'You');
});

socket.on('sanctuary_message', ({ sender, text }) => {
    appendChatMessage(sender, text, false);
});

function appendChatMessage(sender, text, isMe) {
    const msgDiv = document.createElement('div');
    msgDiv.className = isMe ? "text-right" : "text-left";
    msgDiv.innerHTML = `
        <span class="text-xs font-bold ${isMe ? 'text-neutral-500' : 'text-amber-500'}">[${sender}]</span>
        <p class="mt-1 bg-neutral-950 inline-block p-2 rounded max-w-md border border-neutral-900/60 break-all">${text}</p>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendSystemMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = "text-center text-xs text-neutral-600 italic py-2";
    msgDiv.innerText = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
