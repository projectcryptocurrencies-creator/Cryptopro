// Admin Dashboard Functionality - Updated with Database API

let currentChatClientId = null;

async function initAdminDashboard() {
    console.log('Initializing admin dashboard...');
    await updateDashboardStats();
    await loadRecentClients();
    await loadRecentActivity();
    await loadClientsTable();
    await loadWithdrawalsTable();
    await loadChatList();

    // Update stats every 30 seconds
    setInterval(updateDashboardStats, 30000);
}

async function updateDashboardStats() {
    console.log('Updating dashboard stats...');
    const stats = await getDashboardStats();
    console.log('Dashboard stats:', stats);

    // Update DOM
    document.getElementById('totalClients').textContent = (stats.totalClients || 0).toLocaleString();
    document.getElementById('totalAum').textContent = '$' + (stats.totalAum || 0).toLocaleString('en-US', {maximumFractionDigits: 0});
    document.getElementById('pendingWithdrawals').textContent = stats.pendingWithdrawals || 0;

    // Update badges
    const withdrawalCount = document.getElementById('withdrawalCount');
    if (stats.pendingWithdrawals > 0) {
        withdrawalCount.textContent = stats.pendingWithdrawals;
        withdrawalCount.classList.remove('hidden');
    } else {
        withdrawalCount.classList.add('hidden');
    }
}

async function loadRecentClients() {
    const recentClients = await getRecentClients();

    const container = document.getElementById('recentClientsList');
    container.innerHTML = recentClients.map(client => `
        <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <i data-lucide="user" class="w-5 h-5 text-blue-600"></i>
                </div>
                <div>
                    <p class="font-medium text-slate-900">${client.name}</p>
                    <p class="text-sm text-slate-500">$${(client.portfolioValue || 0).toLocaleString()}</p>
                </div>
            </div>
            <span class="px-2 py-1 text-xs rounded-full ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
                ${client.status}
            </span>
        </div>
    `).join('');

    lucide.createIcons();
}

async function loadRecentActivity() {
    const recentTransactions = await getRecentActivity();

    const container = document.getElementById('recentActivityList');
    container.innerHTML = recentTransactions.map(tx => `
        <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 ${tx.type === 'deposit' ? 'bg-green-100' : tx.type === 'withdrawal' ? 'bg-red-100' : 'bg-blue-100'} rounded-full flex items-center justify-center">
                    <i data-lucide="${tx.type === 'deposit' ? 'arrow-down-left' : tx.type === 'withdrawal' ? 'arrow-up-right' : 'trending-up'}" class="w-5 h-5 ${tx.type === 'deposit' ? 'text-green-600' : tx.type === 'withdrawal' ? 'text-red-600' : 'text-blue-600'}"></i>
                </div>
                <div>
                    <p class="font-medium text-slate-900">${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</p>
                    <p class="text-sm text-slate-500">${new Date(tx.date).toLocaleDateString()}</p>
                </div>
            </div>
            <span class="font-medium ${tx.type === 'deposit' || tx.type === 'growth' ? 'text-green-600' : 'text-red-600'}">
                ${tx.type === 'deposit' || tx.type === 'growth' ? '+' : '-'}$${tx.amount.toLocaleString()}
            </span>
        </div>
    `).join('');

    lucide.createIcons();
}

async function loadClientsTable() {
    const clients = await getAllClients();
    const tbody = document.getElementById('clientsTableBody');

    tbody.innerHTML = clients.map(client => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span class="font-medium text-blue-600">${client.name.charAt(0)}</span>
                    </div>
                    <div>
                        <p class="font-medium text-slate-900">${client.name}</p>
                        <p class="text-sm text-slate-500">${client.email}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <p class="font-medium text-slate-900">$${(client.portfolioValue || 0).toLocaleString()}</p>
            </td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-medium ${client.status === 'active' ? 'bg-green-100 text-green-700' : client.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">
                    ${client.status}
                </span>
            </td>
            <td class="px-6 py-4">
                <button onclick="editClient(${client.id})" class="text-blue-600 hover:text-blue-700 mr-3">
                    <i data-lucide="edit" class="w-5 h-5"></i>
                </button>
                <button onclick="deleteClientRecord(${client.id})" class="text-red-600 hover:text-red-700">
                    <i data-lucide="trash" class="w-5 h-5"></i>
                </button>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

function showSection(sectionName) {
    // Hide all sections
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('clientsSection').classList.add('hidden');
    document.getElementById('addClientSection').classList.add('hidden');
    document.getElementById('withdrawalsSection').classList.add('hidden');
    document.getElementById('chatSection').classList.add('hidden');

    // Show selected section
    document.getElementById(sectionName + 'Section').classList.remove('hidden');

    // Update sidebar active state
    document.querySelectorAll('aside button').forEach(btn => {
        btn.classList.remove('bg-blue-50', 'text-blue-700');
        btn.classList.add('text-slate-600');
    });

    // Refresh data
    if (sectionName === 'dashboard') {
        updateDashboardStats();
        loadRecentClients();
        loadRecentActivity();
    } else if (sectionName === 'clients') {
        loadClientsTable();
    } else if (sectionName === 'withdrawals') {
        loadWithdrawalsTable();
    } else if (sectionName === 'chat') {
        loadChatList();
    }
}

function generatePassword() {
    const password = generateRandomPassword(12);
    document.getElementById('generatedPassword').value = password;
    showToast('Password Generated', 'Password has been generated successfully. Save it to share with client.', 'success');
}

function generateRandomPassword(length) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}

// Add new client
document.addEventListener('DOMContentLoaded', function() {
    const addClientForm = document.getElementById('addClientForm');
    if (addClientForm) {
        addClientForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('newClientName').value;
            const email = document.getElementById('newClientEmail').value;
            const phone = document.getElementById('newClientPhone')?.value || '';
            const portfolioValue = parseFloat(document.getElementById('initialDeposit').value);
            const btcAddress = document.getElementById('btcAddress').value;
            const usdtAddress = document.getElementById('usdtAddress').value;
            const generatedPassword = document.getElementById('generatedPassword').value;

            if (!name || !email || !portfolioValue || !btcAddress || !usdtAddress) {
                showToast('Error', 'Please fill in all required fields', 'error');
                return;
            }

            if (!generatedPassword) {
                showToast('Error', 'Please generate a password for the client', 'error');
                return;
            }

            const clientData = {
                name,
                email,
                phone,
                portfolioValue,
                status: 'active'
            };

            const result = await addClient(clientData);

            if (result && result.id) {
                // Add initial deposit transaction
                await addTransaction({
                    clientId: result.id,
                    type: 'deposit',
                    amount: portfolioValue,
                    description: 'Initial deposit'
                });

                showToast('Success', 'Client account created successfully!', 'success');
                addClientForm.reset();

        });
    }

    // Edit client form
    const editClientForm = document.getElementById('editClientForm');
    if (editClientForm) {
        editClientForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const clientId = document.getElementById('editClientId').value;
            const name = document.getElementById('editClientName').value;
            const email = document.getElementById('editClientEmail').value;
            const phone = document.getElementById('editClientPhone').value;
            const portfolioValue = parseFloat(document.getElementById('editPortfolioValue').value);
            const status = document.getElementById('editStatus').value;

            const result = await updateClient(clientId, {
                name,
                email,
                phone,
                portfolioValue,
                status
            });

            if (result && result.success) {
                showToast('Success', 'Client updated successfully', 'success');
                closeEditModal();
                await loadClientsTable();
                await updateDashboardStats();
            } else {
                showToast('Error', 'Failed to update client', 'error');
            }
        });
    }
});

async function editClient(clientId) {
    const client = await getClient(clientId);

    if (client) {
        document.getElementById('editClientId').value = client.id;
        document.getElementById('editClientName').value = client.name;
        document.getElementById('editClientEmail').value = client.email;
        document.getElementById('editClientPhone').value = client.phone || '';
        document.getElementById('editPortfolioValue').value = client.portfolioValue;
        document.getElementById('editStatus').value = client.status;

        document.getElementById('editClientModal').classList.remove('hidden');
        document.getElementById('editClientModal').classList.add('flex');
    }
}

function closeEditModal() {
    document.getElementById('editClientModal').classList.add('hidden');
    document.getElementById('editClientModal').classList.remove('flex');
}

async function deleteClientRecord(clientId) {
    if (confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
        const result = await deleteClient(clientId);
        if (result && result.success) {
            showToast('Success', 'Client deleted successfully', 'success');
            await loadClientsTable();
            await updateDashboardStats();
        } else {
            showToast('Error', 'Failed to delete client', 'error');
        }
    }
}

async function loadWithdrawalsTable() {
    const withdrawals = await getAllWithdrawals();
    const clients = await getAllClients();

    const tbody = document.getElementById('withdrawalsTableBody');

    if (withdrawals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">No withdrawal requests</td></tr>';
        return;
    }

    tbody.innerHTML = withdrawals.map(w => {
        const client = clients.find(c => c.id === w.clientId);
        return `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4">
                <p class="font-medium text-slate-900">${client ? client.name : 'Unknown'}</p>
                <p class="text-sm text-slate-500">${client ? client.email : ''}</p>
            </td>
            <td class="px-6 py-4">
                <p class="font-medium text-slate-900">$${w.amount.toLocaleString()}</p>
            </td>
            <td class="px-6 py-4">
                <p class="text-sm text-slate-900">${w.walletAddress || 'N/A'}</p>
            </td>
            <td class="px-6 py-4">
                <p class="text-sm text-slate-900">${new Date(w.requestDate).toLocaleDateString()}</p>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${w.status === 'pending' ? 'bg-amber-100 text-amber-700' : w.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                    ${w.status}
                </span>
            </td>
            <td class="px-6 py-4">
                <button onclick="processWithdrawal(${w.id}, 'approved')" class="text-green-600 hover:text-green-700 mr-2">
                    <i data-lucide="check" class="w-4 h-4"></i>
                </button>
                <button onclick="processWithdrawal(${w.id}, 'rejected')" class="text-red-600 hover:text-red-700">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');

    lucide.createIcons();
}

async function processWithdrawal(withdrawalId, action) {
    const result = await updateWithdrawalStatus(withdrawalId, action);
    if (result && result.success) {
        showToast('Success', `Withdrawal ${action} successfully`, 'success');
        await loadWithdrawalsTable();
        await updateDashboardStats();
    } else {
        showToast('Error', 'Failed to process withdrawal', 'error');
    }
}

async function loadChatList() {
    const clients = await getAllClients();
    const container = document.getElementById('chatList');

    container.innerHTML = clients.map(client => `
        <div onclick="openChat(${client.id})" class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span class="font-medium text-blue-600">${client.name.charAt(0)}</span>
            </div>
            <div class="flex-1">
                <p class="font-medium text-slate-900">${client.name}</p>
                <p class="text-sm text-slate-500">${client.email}</p>
            </div>
        </div>
    `).join('');
}

async function openChat(clientId) {
    currentChatClientId = clientId;
    const client = await getClient(clientId);
    const messages = await getClientMessages(clientId);

    document.getElementById('chatClientName').textContent = client.name;
    document.getElementById('chatClientEmail').textContent = client.email;

    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = messages.map(msg => `
        <div class="flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'} mb-4">
            <div class="max-w-xs px-4 py-2 rounded-lg ${msg.senderType === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}">
                <p>${msg.message}</p>
                <p class="text-xs mt-1 opacity-70">${new Date(msg.timestamp).toLocaleString()}</p>
            </div>
        </div>
    `).join('');

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    showSection('chat');
}

async function sendMessage() {
    const messageInput = document.getElementById('chatMessageInput');
    const message = messageInput.value.trim();

    if (!message || !currentChatClientId) return;

    const result = await addMessage({
        clientId: currentChatClientId,
        senderType: 'admin',
        message
    });

    if (result) {
        messageInput.value = '';
        await openChat(currentChatClientId); // Refresh messages
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initAdminDashboard();
    showSection('dashboard');
});