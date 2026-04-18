// API Helper Module - Centralized API calls

// Dynamic API base - works locally and on deployed server
const API_BASE = `${window.location.protocol}//${window.location.host}/api`;

// ===== CLIENT API CALLS =====

async function getAllClients() {
    try {
        const response = await fetch(`${API_BASE}/clients`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
    }
}

async function getClient(clientId) {
    try {
        const response = await fetch(`${API_BASE}/clients/${clientId}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching client:', error);
        return null;
    }
}

async function addClient(clientData) {
    try {
        const response = await fetch(`${API_BASE}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding client:', error);
        return null;
    }
}

async function updateClient(clientId, clientData) {
    try {
        const response = await fetch(`${API_BASE}/clients/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error updating client:', error);
        return null;
    }
}

async function deleteClient(clientId) {
    try {
        const response = await fetch(`${API_BASE}/clients/${clientId}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error('Error deleting client:', error);
        return null;
    }
}

// ===== WITHDRAWAL API CALLS =====

async function getAllWithdrawals() {
    try {
        const response = await fetch(`${API_BASE}/withdrawals`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        return [];
    }
}

async function getClientWithdrawals(clientId) {
    try {
        const response = await fetch(`${API_BASE}/clients/${clientId}/withdrawals`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        return [];
    }
}

async function addWithdrawal(withdrawalData) {
    try {
        const response = await fetch(`${API_BASE}/withdrawals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withdrawalData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding withdrawal:', error);
        return null;
    }
}

async function updateWithdrawal(withdrawalId, status) {
    try {
        const response = await fetch(`${API_BASE}/withdrawals/${withdrawalId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return await response.json();
    } catch (error) {
        console.error('Error updating withdrawal:', error);
        return null;
    }
}

// ===== TRANSACTION API CALLS =====

async function getAllTransactions() {
    try {
        const response = await fetch(`${API_BASE}/transactions`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

async function getClientTransactions(clientId) {
    try {
        const response = await fetch(`${API_BASE}/clients/${clientId}/transactions`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

async function addTransaction(transactionData) {
    try {
        const response = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding transaction:', error);
        return null;
    }
}

// ===== MESSAGE API CALLS =====

async function getClientMessages(clientId) {
    try {
        const response = await fetch(`${API_BASE}/clients/${clientId}/messages`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
    }
}

async function addMessage(messageData) {
    try {
        const response = await fetch(`${API_BASE}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding message:', error);
        return null;
    }
}

// ===== DASHBOARD API CALLS =====

async function getDashboardStats() {
    try {
        console.log('Fetching dashboard stats from API...');
        const response = await fetch(`${API_BASE}/dashboard/stats`);
        console.log('API response status:', response.status);
        const data = await response.json();
        console.log('API response data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching stats:', error);
        return {};
    }
}

async function getRecentClients() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/recent-clients`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching recent clients:', error);
        return [];
    }
}

async function getRecentActivity() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/recent-activity`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        return [];
    }
}