// Chat System for Admin and Client

// Load chat list for admin
function loadChatList() {
    const messages = JSON.parse(localStorage.getItem('cpb_messages') || '[]');
    const clients = JSON.parse(localStorage.getItem('cpb_clients') || '[]');
    
    // Get unique clients with messages
    const clientIds = [...new Set(messages.map(m => m.clientId))];
    
    const chatList = document.getElementById('chatList');
    if (!chatList) return;
    
    if (clientIds.length === 0) {
        chatList.innerHTML = '<div class="p-4 text-center text-slate-500">No messages yet</div>';
        return;
    }
    
    // Count unread messages
    const unreadCount = messages.filter(m => m.sender === 'client' && !m.read).length;
    const messageCount = document.getElementById('messageCount');
    if (messageCount) {
        if (unreadCount > 0) {
            messageCount.textContent = unreadCount;
            messageCount.classList.remove('hidden');
        } else {
            messageCount.classList.add('hidden');
        }
    }
    
    chatList.innerHTML = clientIds.map(clientId => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return '';
        
        const clientMessages = messages.filter(m => m.clientId === clientId);
        const lastMessage = clientMessages[clientMessages.length - 1];
        const unreadClientMessages = clientMessages.filter(m => m.sender === 'client' && !m.read).length;
        
        return `
            <div onclick="openChat('${clientId}')" class="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition ${currentChatClientId === clientId ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}">
                <div class="flex items-center justify-between mb-1">
                    <h4 class="font-medium text-slate-900">${client.name}</h4>
                    ${unreadClientMessages > 0 ? `<span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">${unreadClientMessages}</span>` : ''}
                </div>
                <p class="text-sm text-slate-500 truncate">${lastMessage ? lastMessage.message : 'No messages'}</p>
                <p class="text-xs text-slate-400 mt-1">${lastMessage ? new Date(lastMessage.timestamp).toLocaleDateString() : ''}</p>
            </div>
        `;
    }).join('');
}

function openChat(clientId) {
    const clients = JSON.parse(localStorage.getItem('cpb_clients') || '[]');
    const client = clients.find(c => c.id === clientId);
    
    if (!client) return;
    
    currentChatClientId = clientId;
    
    // Show chat header and input
    document.getElementById('chatHeader').classList.remove('hidden');
    document.getElementById('chatInputArea').classList.remove('hidden');
    document.getElementById('chatClientName').textContent = client.name;
    
    // Load messages
    loadChatMessages(clientId);
    
    // Mark messages as read
    const messages = JSON.parse(localStorage.getItem('cpb_messages') || '[]');
    let updated = false;
    messages.forEach(m => {
        if (m.clientId === clientId && m.sender === 'client' && !m.read) {
            m.read = true;
            updated = true;
        }
    });
    
    if (updated) {
        localStorage.setItem('cpb_messages', JSON.stringify(messages));
        loadChatList();
    }
    
    // Refresh UI
    loadChatList();
}

function loadChatMessages(clientId) {
    const messages = JSON.parse(localStorage.getItem('cpb_messages') || '[]');
    const clientMessages = messages.filter(m => m.clientId === clientId);
    
    const container = document.getElementById('chatMessages');
    
    if (clientMessages.length === 0) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-slate-400"><i data-lucide="message-square" class="w-12 h-12 mb-2"></i><p>No messages yet</p></div>';
        lucide.createIcons();
        return;
    }
    
    container.innerHTML = clientMessages.map(msg => {
        const isAdmin = msg.sender === 'admin';
        return `
            <div class="flex items-start gap-3 ${isAdmin ? 'flex-row-reverse' : ''}">
                <div class="w-8 h-8 ${isAdmin ? 'bg-blue-100' : 'bg-slate-100'} rounded-full flex items-center justify-center shrink-0">
                    <i data-lucide="${isAdmin ? 'user-check' : 'user'}" class="w-4 h-4 ${isAdmin ? 'text-blue-600' : 'text-slate-600'}"></i>
                </div>
                <div class="${isAdmin ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'} p-3 rounded-lg ${isAdmin ? 'rounded-tr-none' : 'rounded-tl-none'} shadow-sm max-w-[80%]">
                    <p class="text-sm">${msg.message}</p>
                    <span class="text-xs ${isAdmin ? 'text-blue-100' : 'text-slate-400'} mt-1 block">
                        ${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Admin chat form handler
document.addEventListener('DOMContentLoaded', function() {
    const adminChatForm = document.getElementById('adminChatForm');
    if (adminChatForm) {
        adminChatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const input = document.getElementById('adminMessageInput');
            const message = input.value.trim();
            
            if (!message || !currentChatClientId) return;
            
            // Save message
            const messages = JSON.parse(localStorage.getItem('cpb_messages') || '[]');
            messages.push({
                id: 'msg_' + Date.now(),
                clientId: currentChatClientId,
                sender: 'admin',
                message: message,
                timestamp: new Date().toISOString(),
                read: true
            });
            
            localStorage.setItem('cpb_messages', JSON.stringify(messages));
            
            // Reload messages
            loadChatMessages(currentChatClientId);
            loadChatList();
            
            input.value = '';
        });
    }
});