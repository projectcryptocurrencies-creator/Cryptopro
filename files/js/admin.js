// Admin Dashboard Functionality - Fixed

let currentChatClientId = null;

function getLocalClients() {
    return JSON.parse(localStorage.getItem('cpb_clients') || '[]');
}

function saveLocalClients(clients) {
    localStorage.setItem('cpb_clients', JSON.stringify(clients));
}

function saveClientLocally(client) {
    const clients = getLocalClients();
    const existingIndex = clients.findIndex(c => c.id === client.id);
    if (existingIndex >= 0) {
        clients[existingIndex] = { ...clients[existingIndex], ...client };
    } else {
        clients.push(client);
    }
    saveLocalClients(clients);
}

function removeClientLocally(clientId) {
    const clients = getLocalClients().filter(c => c.id !== clientId);
    saveLocalClients(clients);
}

async function initAdminDashboard() {
    await updateDashboardStats();
    await loadRecentClients();
    await loadRecentActivity();
    await loadClientsTable();
    await loadWithdrawalsTable();
    await loadChatList();

    setInterval(updateDashboardStats, 30000);
}

async function updateDashboardStats() {
    const stats = await getDashboardStats();

    document.getElementById('totalClients').textContent = (stats.totalClients || 0).toLocaleString();
    document.getElementById('totalAum').textContent = '$' + (stats.totalAum || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
    document.getElementById('pendingWithdrawals').textContent = stats.pendingWithdrawals || 0;

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

    if (!container) return;

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

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadRecentActivity() {
    const recentTransactions = await getRecentActivity();
    const container = document.getElementById('recentActivityList');

    if (!container) return;

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

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadClientsTable() {
    const clients = await getAllClients();
    const tbody = document.getElementById('clientsTableBody');

    if (!tbody) return;

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
                <p class="font-medium text-slate-900">${(client.dailyGrowthRate || 1.57).toFixed(2)}%</p>
            </td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-medium ${client.status === 'active' ? 'bg-green-100 text-green-700' : client.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">
                    ${client.status}
                </span>
            </td>
            <td class="px-6 py-4">
                <button type="button" onclick="editClient(${client.id})" class="text-blue-600 hover:text-blue-700 mr-3">
                    <i data-lucide="edit" class="w-5 h-5"></i>
                </button>
                <button type="button" onclick="deleteClientRecord(${client.id})" class="text-red-600 hover:text-red-700">
                    <i data-lucide="trash" class="w-5 h-5"></i>
                </button>
            </td>
        </tr>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showSection(sectionName) {
    const sections = ['dashboard', 'clients', 'addClient', 'withdrawals', 'chat'];
    sections.forEach(name => {
        const section = document.getElementById(name + 'Section');
        if (section) section.classList.add('hidden');
    });

    const target = document.getElementById(sectionName + 'Section');
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('aside button').forEach(btn => {
        btn.classList.remove('bg-blue-50', 'text-blue-700');
        btn.classList.add('text-slate-600');
    });

    const activeBtn = Array.from(document.querySelectorAll('aside button')).find(btn => btn.textContent.trim().startsWith(sectionName.charAt(0).toUpperCase() + sectionName.slice(1)));
    if (activeBtn) {
        activeBtn.classList.add('bg-blue-50', 'text-blue-700');
        activeBtn.classList.remove('text-slate-600');
    }

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
    const passwordField = document.getElementById('generatedPassword');
    if (passwordField) passwordField.value = password;
    showToast('Password Generated', 'Password has been generated successfully.', 'success');
}

function generateRandomPassword(length) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

function initFormHandlers() {
    const addClientForm = document.getElementById('addClientForm');
    if (addClientForm) {
        addClientForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const name = document.getElementById('newClientName').value.trim();
            const email = document.getElementById('newClientEmail').value.trim();
            const phone = document.getElementById('newClientPhone')?.value.trim() || '';
            const portfolioValue = parseFloat(document.getElementById('initialDeposit').value);
            const generatedPassword = document.getElementById('generatedPassword').value.trim();
            const btcAddress = document.getElementById('btcAddress').value.trim();
            const usdtAddress = document.getElementById('usdtAddress').value.trim();
            const dailyGrowthRate = parseFloat(document.getElementById('dailyGrowthRate').value) || 1.57;

            if (!name || !email || !portfolioValue || !generatedPassword || !btcAddress || !usdtAddress) {
                showToast('Error', 'Please fill in all required fields, generate a password, and provide wallet addresses.', 'error');
                return;
            }

            const clientData = {
                name,
                email,
                phone,
                portfolioValue,
                status: 'active',
                password: generatedPassword,
                btcAddress,
                usdtAddress,
                dailyGrowthRate
            };

            const result = await addClient(clientData);
            if (result && result.id) {
                const localClient = {
                    id: result.id,
                    name,
                    email,
                    phone,
                    portfolioValue,
                    initialDeposit: portfolioValue,
                    status: 'active',
                    password: generatedPassword,
                    btcAddress,
                    usdtAddress,
                    dailyGrowthRate,
                    joinDate: result.joinDate || new Date().toISOString(),
                    createdAt: result.createdAt || new Date().toISOString(),
                    updatedAt: result.updatedAt || new Date().toISOString()
                };
                saveClientLocally(localClient);

                await addTransaction({
                    clientId: result.id,
                    type: 'deposit',
                    amount: portfolioValue,
                    description: 'Initial deposit'
                });

                showToast('Success', 'Client account created successfully!', 'success');
                addClientForm.reset();
                showSection('clients');
            } else {
                showToast('Error', 'Failed to create client.', 'error');
            }
        });
    }

    const editClientForm = document.getElementById('editClientForm');
    if (editClientForm) {
        editClientForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const clientId = document.getElementById('editClientId').value;
            const name = document.getElementById('editClientName').value.trim();
            const email = document.getElementById('editClientEmail').value.trim();
            const phone = document.getElementById('editClientPhone').value.trim();
            const portfolioValue = parseFloat(document.getElementById('editPortfolioValue').value);
            const status = document.getElementById('editStatus').value;
            const btcAddress = document.getElementById('editBtcAddress').value.trim();
            const usdtAddress = document.getElementById('editUsdtAddress').value.trim();
            const dailyGrowthRate = parseFloat(document.getElementById('editDailyGrowthRate').value) || 1.57;

            const result = await updateClient(clientId, {
                name,
                email,
                phone,
                portfolioValue,
                status,
                btcAddress,
                usdtAddress,
                dailyGrowthRate
            });

            if (result && result.success) {
                saveClientLocally({
                    id: parseInt(clientId, 10),
                    name,
                    email,
                    phone,
                    portfolioValue,
                    status,
                    btcAddress,
                    usdtAddress,
                    dailyGrowthRate,
                    updatedAt: new Date().toISOString()
                });
                
                // Log portfolio changes as admin adjustments
                const originalData = window.originalClientData || {};
                const originalPortfolio = originalData.portfolioValue || 0;
                
                if (portfolioValue !== originalPortfolio) {
                    const difference = portfolioValue - originalPortfolio;
                    const txDescription = difference > 0 ? 'Profit' : 'Loss';
                    
                    await addTransaction({
                        clientId: parseInt(clientId, 10),
                        type: 'update',
                        amount: difference,
                        description: txDescription
                    });
                }
                
                showToast('Success', 'Client updated successfully.', 'success');
                closeEditModal();
                await loadClientsTable();
                await updateDashboardStats();
            } else {
                showToast('Error', 'Failed to update client.', 'error');
            }
        });
    }

    const chatForm = document.getElementById('adminChatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const input = document.getElementById('adminMessageInput');
            const message = input.value.trim();

            if (!message || !currentChatClientId) {
                showToast('Error', 'Select a client and type a message.', 'error');
                return;
            }

            const result = await addMessage({
                clientId: currentChatClientId,
                senderType: 'admin',
                message
            });

            if (result && result.id) {
                input.value = '';
                await openChat(currentChatClientId);
            }
        });
    }
}

async function editClient(clientId) {
    const client = await getClient(clientId);
    if (!client) {
        showToast('Error', 'Client not found.', 'error');
        return;
    }

    // Store original client data for comparison when saving
    window.originalClientData = JSON.parse(JSON.stringify(client));

    document.getElementById('editClientId').value = client.id;
    document.getElementById('editClientName').value = client.name;
    document.getElementById('editClientEmail').value = client.email;
    document.getElementById('editClientPhone').value = client.phone || '';
    document.getElementById('editPortfolioValue').value = client.portfolioValue || 0;
    document.getElementById('editStatus').value = client.status || 'active';
    document.getElementById('editBtcAddress').value = client.btcAddress || '';
    document.getElementById('editUsdtAddress').value = client.usdtAddress || '';
    document.getElementById('editDailyGrowthRate').value = client.dailyGrowthRate || 1.57;

    const modal = document.getElementById('editClientModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeEditModal() {
    const modal = document.getElementById('editClientModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function deleteClientRecord(clientId) {
    if (!confirm('Are you sure you want to delete this client?')) return;

    const result = await deleteClient(clientId);
    if (result && result.success) {
        removeClientLocally(clientId);
        showToast('Success', 'Client deleted successfully.', 'success');
        await loadClientsTable();
        await updateDashboardStats();
    } else {
        showToast('Error', 'Failed to delete client.', 'error');
    }
}

async function loadWithdrawalsTable() {
    const withdrawals = await getAllWithdrawals();
    const clients = await getAllClients();
    const tbody = document.getElementById('withdrawalsTableBody');

    if (!tbody) return;

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
                    ${w.status === 'pending' ? `
                    <button type="button" onclick="processWithdrawal(${w.id}, 'approved')" class="text-green-600 hover:text-green-700 mr-2" title="Approve">
                        <i data-lucide="check" class="w-4 h-4"></i>
                    </button>
                    <button type="button" onclick="processWithdrawal(${w.id}, 'rejected')" class="text-red-600 hover:text-red-700" title="Reject">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                    ` : '<span class="text-slate-500">Processed</span>'}
                </td>
            </tr>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function processWithdrawal(withdrawalId, action) {
    const result = await updateWithdrawal(withdrawalId, action);
    if (result && result.success) {
        showToast('Success', `Withdrawal ${action} successfully`, 'success');
        await loadWithdrawalsTable();
        await updateDashboardStats();
    } else {
        showToast('Error', 'Failed to process withdrawal.', 'error');
    }
}

async function loadChatList() {
    const clients = await getAllClients();
    const container = document.getElementById('chatList');

    if (!container) return;

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

    const chatHeader = document.getElementById('chatHeader');
    if (chatHeader) chatHeader.classList.remove('hidden');

    document.getElementById('chatClientName').textContent = client.name;
    document.getElementById('chatClientEmail').textContent = client.email;

    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        messagesContainer.innerHTML = messages.map(msg => `
            <div class="flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'} mb-4">
                <div class="max-w-xs px-4 py-2 rounded-lg ${msg.senderType === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}">
                    <p>${msg.message}</p>
                    <p class="text-xs mt-1 opacity-70">${new Date(msg.timestamp).toLocaleString()}</p>
                </div>
            </div>
        `).join('');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    const chatInputArea = document.getElementById('chatInputArea');
    if (chatInputArea) chatInputArea.classList.remove('hidden');
    showSection('chat');
}

async function sendMessage() {
    const messageInput = document.getElementById('adminMessageInput');
    const message = messageInput.value.trim();
    if (!message || !currentChatClientId) return;

    const result = await addMessage({
        clientId: currentChatClientId,
        senderType: 'admin',
        message
    });

    if (result && result.id) {
        messageInput.value = '';
        await openChat(currentChatClientId);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    initAdminDashboard();
    initFormHandlers();
    showSection('dashboard');
});
