const socket = io();
let myPrivateKey = null;

const entranceView = document.getElementById('entrance-view');
const backupView = document.getElementById('backup-view');
const chatView = document.getElementById('chat-view');
const keyDisplay = document.getElementById('key-display');
const chatMessages = document.getElementById('chat-messages');
const msgInput = document.getElementById('msg-input');
const statusTag = document.getElementById('status-tag');

document.getElementById('generate-btn').addEventListener('click', () => {
    socket.emit('request_identity');
});

socket.on('identity_generated', (key) => {
    myPrivateKey = key;
    keyDisplay.innerText = key;
    entranceView.classList.add('hidden');
    backupView.classList.remove('hidden');
});

document.getElementById('acknowledge-btn').addEventListener('click', () => {
    backupView.classList.add('hidden');
    chatView.classList.remove('hidden');
    appendSystemMessage("GATEKEEPER: Welcome candidate. Explain yourself in one or a few messages. Who are you, and what is your meaning of life?");
});

document.getElementById('login-btn').addEventListener('click', () => {
    const enteredKey = document.getElementById('login-key-input').value.trim();
    if(enteredKey) {
        myPrivateKey = enteredKey;
        socket.emit('auth_with_key', enteredKey);
    }
});

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
