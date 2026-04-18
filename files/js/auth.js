// Authentication System
const AUTH_KEY = 'cpb_auth';
const ADMIN_CREDENTIALS = {
    email: 'admin@cryptobroker.com',
    password: 'admin123'
};

// Initialize storage
function initStorage() {
    if (!localStorage.getItem('cpb_clients')) {
        localStorage.setItem('cpb_clients', JSON.stringify([]));
    }
    if (!localStorage.getItem('cpb_transactions')) {
        localStorage.setItem('cpb_transactions', JSON.stringify([]));
    }
    if (!localStorage.getItem('cpb_messages')) {
        localStorage.setItem('cpb_messages', JSON.stringify([]));
    }
    if (!localStorage.getItem('cpb_withdrawals')) {
        localStorage.setItem('cpb_withdrawals', JSON.stringify([]));
    }
}

// Generate random password
function generateRandomPassword(length = 10) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}

// Login function
function login(email, password, isAdmin = false) {
    if (isAdmin) {
        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
            const authData = {
                type: 'admin',
                email: email,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
            return { success: true, redirect: 'admin.html' };
        }
        return { success: false, message: 'Invalid admin credentials' };
    } else {
        const clients = JSON.parse(localStorage.getItem('cpb_clients') || '[]');
        const client = clients.find(c => c.email === email && c.password === password);
        
        if (client) {
            if (client.status === 'suspended') {
                return { success: false, message: 'Account suspended. Contact admin.' };
            }
            const authData = {
                type: 'client',
                id: client.id,
                email: email,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
            return { success: true, redirect: 'client.html' };
        }
        return { success: false, message: 'Invalid email or password' };
    }
}

// Logout function
function logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = 'login.html';
}

// Check if user is authenticated
function requireAuth() {
    const auth = localStorage.getItem(AUTH_KEY);
    if (!auth) return false;
    
    const authData = JSON.parse(auth);
    // Check if session is still valid (24 hours)
    const loginTime = new Date(authData.loginTime);
    const now = new Date();
    const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
        localStorage.removeItem(AUTH_KEY);
        return false;
    }
    return true;
}

// Check if user is admin
function isAdmin() {
    const auth = localStorage.getItem(AUTH_KEY);
    if (!auth) return false;
    const authData = JSON.parse(auth);
    return authData.type === 'admin';
}

// Get current user
function getCurrentUser() {
    const auth = localStorage.getItem(AUTH_KEY);
    if (!auth) return null;
    const authData = JSON.parse(auth);
    
    if (authData.type === 'admin') {
        return { ...authData, name: 'Administrator' };
    } else {
        const clients = JSON.parse(localStorage.getItem('cpb_clients') || '[]');
        return clients.find(c => c.id === authData.id);
    }
}

// Initialize storage on load
initStorage();