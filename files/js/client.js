// Client Dashboard Functionality

let clientData = null;

function initClientDashboard() {
    clientData = getCurrentUser();
    
    if (!clientData) {
        window.location.href = 'login.html';
        return;
    }
    
    // Apply daily growth if needed
    applyDailyGrowth();
    
    // Update header info
    document.getElementById('clientName').textContent = clientData.name;
    document.getElementById('clientEmail').textContent = clientData.email;
    
    updatePortfolioDisplay();
    loadWalletAddresses();
    loadTransactions();
    loadGrowthChart();
    loadMarketPrices();
    
    // Check withdrawal availability
    checkWithdrawalStatus();
    
    // Setup event listeners
    setupEventListeners();
    
    // Refresh every 10 seconds for real-time transaction updates
    setInterval(() => {
        syncClientDataFromServer();
    }, 10000);
    
    // Refresh market prices every 15 seconds
    setInterval(() => {
        loadMarketPrices();
    }, 15000);
}

function applyDailyGrowth() {
    if (!clientData) return;
    
    const lastGrowthDate = localStorage.getItem(`lastGrowth_${clientData.id}`);
    const lastAppliedRate = parseFloat(localStorage.getItem(`lastGrowthRate_${clientData.id}`) || clientData.dailyGrowthRate);
    const today = new Date().toDateString();
    const currentRate = clientData.dailyGrowthRate || 1.57;
    
    // Apply if it's a new day OR if the rate changed (admin update)
    const shouldApply = lastGrowthDate !== today || lastAppliedRate !== currentRate;
    
    if (shouldApply) {
        // Apply daily growth
        const growthAmount = (clientData.portfolioValue * currentRate) / 100;
        const newValue = clientData.portfolioValue + growthAmount;
        
        // Update local storage
        const clients = JSON.parse(localStorage.getItem('cpb_clients') || '[]');
        const clientIndex = clients.findIndex(c => c.id === clientData.id);
        if (clientIndex >= 0) {
            clients[clientIndex].portfolioValue = newValue;
            localStorage.setItem('cpb_clients', JSON.stringify(clients));
            
            // Add growth transaction
            const transactions = JSON.parse(localStorage.getItem('cpb_transactions') || '[]');
            transactions.push({
                id: Date.now(),
                clientId: clientData.id,
                type: 'growth',
                amount: growthAmount,
                date: new Date().toISOString(),
                description: `Daily growth at ${currentRate}%`
            });
            localStorage.setItem('cpb_transactions', JSON.stringify(transactions));
            
            // Mark growth as applied today with current rate
            localStorage.setItem(`lastGrowth_${clientData.id}`, today);
            localStorage.setItem(`lastGrowthRate_${clientData.id}`, currentRate);
            
            // Update clientData reference
            clientData.portfolioValue = newValue;
        }
    }
}

async function syncClientDataFromServer() {
    if (!clientData) return;
    
    try {
        const response = await fetch(`/api/clients/${clientData.id}`);
        if (response.ok) {
            const serverData = await response.json();
            // Check if there are any changes (portfolio, daily rate, wallet addresses, status)
            const dataChanged = 
                serverData.portfolioValue !== clientData.portfolioValue ||
                serverData.dailyGrowthRate !== clientData.dailyGrowthRate ||
                serverData.btcAddress !== clientData.btcAddress ||
                serverData.usdtAddress !== clientData.usdtAddress ||
                serverData.status !== clientData.status;
            
            if (dataChanged) {
                // Check if daily growth rate changed (admin adjustment)
                const rateChanged = serverData.dailyGrowthRate !== clientData.dailyGrowthRate;
                
                // Preserve existing fields that only exist in localStorage (like initialDeposit)
                const mergedData = {
                    ...clientData,
                    ...serverData
                };
                
                // Update local client data with merged data
                clientData = mergedData;
                localStorage.setItem('user', JSON.stringify(mergedData));
                
                // Also update in cpb_clients array for persistence
                const clients = JSON.parse(localStorage.getItem('cpb_clients') || '[]');
                const clientIndex = clients.findIndex(c => c.id === clientData.id);
                if (clientIndex >= 0) {
                    clients[clientIndex] = mergedData;
                    localStorage.setItem('cpb_clients', JSON.stringify(clients));
                }
                
                // If rate changed by admin, immediately apply daily growth with new rate
                if (rateChanged) {
                    applyDailyGrowth();
                }
                
                // Refresh UI displays
                updatePortfolioDisplay();
                loadWalletAddresses();
                
                console.log('Client data synced from server');
            }
        }
    } catch (error) {
        console.error('Error syncing client data from server:', error);
    }
    
    // Always fetch latest transactions regardless of other data changes
    await loadTransactions();
}

function updatePortfolioDisplay() {
    if (!clientData) return;
    
    // Calculate growth
    const initialDeposit = clientData.initialDeposit || 0;
    const currentValue = clientData.portfolioValue || 0;
    const totalGrowth = initialDeposit > 0 ? ((currentValue - initialDeposit) / initialDeposit) * 100 : 0;
    const todayGrowth = clientData.dailyGrowthRate || 1.57;
    
    // Update values with animation
    animateValue('portfolioValue', currentValue, '$');
    animateValue('initialDeposit', initialDeposit, '$');
    document.getElementById('todayGrowth').textContent = '+' + todayGrowth.toFixed(2) + '%';
    document.getElementById('totalGrowth').textContent = (totalGrowth >= 0 ? '+' : '') + totalGrowth.toFixed(2) + '%';
    
    // Update available balance in withdrawal modal
    const availableBalance = document.getElementById('availableBalance');
    if (availableBalance) {
        availableBalance.textContent = '$' + currentValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
}

async function loadMarketPrices() {
    const ids = 'bitcoin,ethereum,tether';
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const priceTargets = [
        { id: 'bitcoin', symbol: 'BTC', priceId: 'btcPrice', changeId: 'btcChange' },
        { id: 'ethereum', symbol: 'ETH', priceId: 'ethPrice', changeId: 'ethChange' },
        { id: 'tether', symbol: 'USDT', priceId: 'usdtPrice', changeId: 'usdtChange' }
    ];

    try {
        const response = await fetch(url);
        const data = await response.json();

        priceTargets.forEach(target => {
            const market = data[target.id];
            if (!market) return;

            const price = market.usd || 0;
            const change = market.usd_24h_change || 0;
            const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            const changeElement = document.getElementById(target.changeId);
            const priceElement = document.getElementById(target.priceId);

            if (priceElement) {
                priceElement.textContent = '$' + price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
            if (changeElement) {
                changeElement.textContent = changeText;
                changeElement.className = change >= 0 ? 'text-sm text-emerald-600 mt-1' : 'text-sm text-red-600 mt-1';
            }
        });
    } catch (error) {
        console.error('Error loading market prices:', error);
    }
}

function refreshMarketPrices() {
    const button = document.getElementById('refreshMarketBtn');
    button.disabled = true;
    button.textContent = 'Refreshing...';

    loadMarketPrices().finally(() => {
        button.disabled = false;
        button.textContent = 'Refresh';
    });
}

function animateValue(elementId, value, prefix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const formatted = prefix + value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    element.textContent = formatted;
}

function loadWalletAddresses() {
    if (!clientData) return;
    
    document.getElementById('btcAddress').textContent = clientData.btcAddress || 'Not set';
    document.getElementById('usdtAddress').textContent = clientData.usdtAddress || 'Not set';
}

function checkWithdrawalStatus() {
    if (!clientData) return;
    
    // Calculate unlock date (14 days from creation)
    const createdAt = new Date(clientData.createdAt || clientData.loginTime || Date.now());
    const unlockDate = new Date(createdAt.getTime() + (14 * 24 * 60 * 60 * 1000));
    const now = new Date();
    const isUnlocked = now >= unlockDate;
    
    const lockedDiv = document.getElementById('withdrawalLocked');
    const unlockedDiv = document.getElementById('withdrawalUnlocked');
    const unlockDateSpan = document.getElementById('unlockDate');
    
    if (isUnlocked) {
        lockedDiv.classList.add('hidden');
        unlockedDiv.classList.remove('hidden');
    } else {
        lockedDiv.classList.remove('hidden');
        unlockedDiv.classList.add('hidden');
        unlockDateSpan.textContent = unlockDate.toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
    }
}

async function loadTransactions() {
    // Fetch transactions from server to ensure we have latest data
    try {
        const response = await fetch(`/api/clients/${clientData.id}/transactions`);
        if (response.ok) {
            const serverTransactions = await response.json();
            // Store server transactions in localStorage for offline access
            const allTransactions = JSON.parse(localStorage.getItem('cpb_transactions') || '[]');
            // Merge and deduplicate based on ID
            const transactionMap = new Map();
            allTransactions.forEach(t => transactionMap.set(t.id || JSON.stringify(t), t));
            serverTransactions.forEach(t => transactionMap.set(t.id || JSON.stringify(t), t));
            localStorage.setItem('cpb_transactions', JSON.stringify(Array.from(transactionMap.values())));
        }
    } catch (error) {
        console.error('Error fetching transactions from server:', error);
    }
    
    const allTransactions = JSON.parse(localStorage.getItem('cpb_transactions') || '[]');
    const clientTransactions = allTransactions.filter(t => t.clientId === clientData.id).slice(-10).reverse();
    
    const tbody = document.getElementById('transactionTableBody');
    const mobileList = document.getElementById('mobileTransactionsList');
    const noTransactions = document.getElementById('noTransactions');
    
    if (clientTransactions.length === 0) {
        tbody.innerHTML = '';
        if (mobileList) mobileList.innerHTML = '';
        noTransactions.classList.remove('hidden');
        return;
    }
    
    noTransactions.classList.add('hidden');
    
    // Desktop table rendering
    tbody.innerHTML = clientTransactions.map(tx => `
        <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 text-sm text-slate-900">
                ${new Date(tx.date).toLocaleDateString()}
            </td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${getTransactionTypeStyle(tx.type)}">
                    ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                </span>
            </td>
            <td class="px-4 py-3 text-sm font-medium ${tx.type === 'deposit' || tx.type === 'growth' || (tx.type === 'update' && tx.amount > 0) ? 'text-green-600' : (tx.type === 'withdrawal' || tx.type === 'loss' || (tx.type === 'update' && tx.amount < 0)) ? 'text-red-600' : 'text-slate-900'}">
                ${tx.type === 'deposit' || tx.type === 'growth' || (tx.type === 'update' && tx.amount > 0) ? '+' : (tx.type === 'withdrawal' || tx.type === 'loss' || (tx.type === 'update' && tx.amount < 0)) ? '-' : ''}$${Math.abs(tx.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    ${tx.status || 'Completed'}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-slate-600">
                ${tx.description || '-'}
            </td>
        </tr>
    `).join('');
    
    // Mobile card rendering
    if (mobileList) {
        mobileList.innerHTML = clientTransactions.map(tx => `
            <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="text-xs text-slate-500 uppercase font-semibold">${new Date(tx.date).toLocaleDateString()}</p>
                        <span class="inline-block px-2 py-1 mt-1 text-xs font-medium rounded-full ${getTransactionTypeStyle(tx.type)}">
                            ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </span>
                    </div>
                    <p class="text-sm font-bold ${tx.type === 'deposit' || tx.type === 'growth' || (tx.type === 'update' && tx.amount > 0) ? 'text-green-600' : (tx.type === 'withdrawal' || tx.type === 'loss' || (tx.type === 'update' && tx.amount < 0)) ? 'text-red-600' : 'text-slate-900'}">
                        ${tx.type === 'deposit' || tx.type === 'growth' || (tx.type === 'update' && tx.amount > 0) ? '+' : (tx.type === 'withdrawal' || tx.type === 'loss' || (tx.type === 'update' && tx.amount < 0)) ? '-' : ''}$${Math.abs(tx.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                </div>
                ${tx.description ? `<p class="text-xs text-slate-600 mb-2">${tx.description}</p>` : ''}
                <p class="text-xs text-slate-500">${tx.status || 'Completed'}</p>
            </div>
        `).join('');
    }
}

function getTransactionTypeStyle(type) {
    switch(type) {
        case 'deposit': return 'bg-blue-100 text-blue-700';
        case 'growth': return 'bg-green-100 text-green-700';
        case 'withdrawal': return 'bg-red-100 text-red-700';
        case 'loss': return 'bg-red-100 text-red-700';
        case 'update': return 'bg-slate-100 text-slate-700';
        default: return 'bg-slate-100 text-slate-700';
    }
}

function loadGrowthChart() {
    const allTransactions = JSON.parse(localStorage.getItem('cpb_transactions') || '[]');
    const growthTransactions = allTransactions.filter(t => 
        t.clientId === clientData.id && (t.type === 'growth' || t.type === 'deposit')
    ).slice(-14); // Last 14 days
    
    const chartContainer = document.getElementById('growthChart');
    if (!chartContainer || growthTransactions.length === 0) return;
    
    const maxAmount = Math.max(...growthTransactions.map(t => t.amount));
    
    chartContainer.innerHTML = growthTransactions.map((tx, index) => {
        const height = (tx.amount / maxAmount) * 100;
        const isGrowth = tx.type === 'growth';
        return `
            <div class="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                <div class="w-full ${isGrowth ? 'bg-blue-500' : 'bg-green-500'} rounded-t transition-all hover:opacity-80 relative" 
                     style="height: ${Math.max(height, 10)}%">
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        $${tx.amount.toFixed(2)}
                    </div>
                </div>
                <span class="text-xs text-slate-400">${new Date(tx.date).getDate()}</span>
            </div>
        `;
    }).join('');
}

async function refreshTransactionsWithFeedback() {
    const btn = document.getElementById('refreshTransactionsBtn');
    const icon = document.getElementById('refreshIcon');
    
    // Disable button and show spinning animation
    btn.disabled = true;
    icon.classList.add('spinning');
    
    try {
        // Only refresh transactions without syncing other data
        await loadTransactions();
        
        // Show success feedback
        showToast('Success', 'Transaction history updated', 'success');
    } catch (error) {
        console.error('Error refreshing transactions:', error);
        showToast('Error', 'Failed to refresh transactions', 'error');
    } finally {
        // Re-enable button and remove spinning animation
        btn.disabled = false;
        icon.classList.remove('spinning');
        
        // Re-create icons
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied!', 'Wallet address copied to clipboard', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied!', 'Wallet address copied to clipboard', 'success');
    });
}

function toggleChat() {
    const sidebar = document.getElementById('chatSidebar');
    const overlay = document.getElementById('chatOverlay');
    const badge = document.getElementById('chatBadge');
    
    if (sidebar.classList.contains('translate-x-full')) {
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        badge.classList.add('hidden');
        
        // Load chat messages
        loadClientChat();
    } else {
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    }
}

function openWithdrawalModal() {
    const modal = document.getElementById('withdrawalModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Update available balance
    const availableBalance = document.getElementById('availableBalance');
    if (availableBalance && clientData) {
        availableBalance.textContent = '$' + (clientData.portfolioValue || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
}

function closeWithdrawalModal() {
    const modal = document.getElementById('withdrawalModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('withdrawalForm').reset();
}

function setupEventListeners() {
    // Chat toggle
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', toggleChat);
    }
    
    // Withdrawal form
    const withdrawalForm = document.getElementById('withdrawalForm');
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const amount = parseFloat(document.getElementById('withdrawalAmount').value);
            const walletType = document.querySelector('input[name="walletType"]:checked')?.value;
            const destinationAddress = document.getElementById('destinationAddress').value;
            
            if (!clientData) return;
            
            if (amount > clientData.portfolioValue) {
                showToast('Error', 'Insufficient balance', 'error');
                return;
            }
            
            if (amount < 100) {
                showToast('Error', 'Minimum withdrawal is $100', 'error');
                return;
            }
            
            // Create withdrawal request
            const withdrawals = JSON.parse(localStorage.getItem('cpb_withdrawals') || '[]');
            withdrawals.push({
                id: 'wd_' + Date.now(),
                clientId: clientData.id,
                amount: amount,
                walletType: walletType,
                destinationAddress: destinationAddress,
                status: 'pending',
                requestedAt: new Date().toISOString()
            });
            
            localStorage.setItem('cpb_withdrawals', JSON.stringify(withdrawals));
            
            // Simulate email notification to admin
            console.log('Email notification sent to admin: New withdrawal request from ' + clientData.email + ' for $' + amount);
            
            showToast('Success', 'Withdrawal request submitted. Admin has been notified via email.', 'success');
            closeWithdrawalModal();
            
            // Reload to update UI
            setTimeout(() => {
                location.reload();
            }, 2000);
        });
    }
    
    // Client chat form
    const clientChatForm = document.getElementById('clientChatForm');
    if (clientChatForm) {
        clientChatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const input = document.getElementById('clientMessageInput');
            const message = input.value.trim();
            
            if (!message || !clientData) return;
            
            // Save message
            const messages = JSON.parse(localStorage.getItem('cpb_messages') || '[]');
            messages.push({
                id: 'msg_' + Date.now(),
                clientId: clientData.id,
                sender: 'client',
                message: message,
                timestamp: new Date().toISOString(),
                read: false
            });
            
            localStorage.setItem('cpb_messages', JSON.stringify(messages));
            
            // Add to UI
            addMessageToChat(message, 'client');
            
            input.value = '';
            
            // Simulate admin reply after 2 seconds (for demo)
            setTimeout(() => {
                const adminReply = {
                    id: 'msg_' + Date.now(),
                    clientId: clientData.id,
                    sender: 'admin',
                    message: 'Thank you for your message. Our admin team will review and respond shortly.',
                    timestamp: new Date().toISOString(),
                    read: true
                };
                messages.push(adminReply);
                localStorage.setItem('cpb_messages', JSON.stringify(messages));
                addMessageToChat(adminReply.message, 'admin');
            }, 2000);
        });
    }
}

function loadClientChat() {
    if (!clientData) return;
    
    const allMessages = JSON.parse(localStorage.getItem('cpb_messages') || '[]');
    const clientMessages = allMessages.filter(m => m.clientId === clientData.id);
    
    const container = document.getElementById('chatMessagesClient');
    
    // Clear existing (except welcome message)
    const welcomeMessage = container.firstElementChild;
    container.innerHTML = '';
    container.appendChild(welcomeMessage);
    
    clientMessages.forEach(msg => {
        addMessageToChat(msg.message, msg.sender, new Date(msg.timestamp), false);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function addMessageToChat(message, sender, timestamp = new Date(), scroll = true) {
    const container = document.getElementById('chatMessagesClient');
    if (!container) return;
    
    const isClient = sender === 'client';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start gap-3 ${isClient ? 'flex-row-reverse' : ''}`;
    messageDiv.innerHTML = `
        <div class="w-8 h-8 ${isClient ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center shrink-0">
            <i data-lucide="${isClient ? 'user' : 'user-check'}" class="w-4 h-4 ${isClient ? 'text-green-600' : 'text-blue-600'}"></i>
        </div>
        <div class="${isClient ? 'bg-blue-600 text-white' : 'bg-white'} p-3 rounded-lg ${isClient ? 'rounded-tr-none' : 'rounded-tl-none'} shadow-sm max-w-[80%]">
            <p class="text-sm">${message}</p>
            <span class="text-xs ${isClient ? 'text-blue-100' : 'text-slate-400'} mt-1 block">
                ${timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
        </div>
    `;
    
    container.appendChild(messageDiv);
    lucide.createIcons();
    
    if (scroll) {
        container.scrollTop = container.scrollHeight;
    }
}

function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toastIcon.className = 'w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-green-100 text-green-600';
        toastIcon.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5"></i>';
    } else if (type === 'error') {
        toastIcon.className = 'w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-red-100 text-red-600';
        toastIcon.innerHTML = '<i data-lucide="alert-circle" class="w-5 h-5"></i>';
    }
    
    lucide.createIcons();
    
    toast.classList.remove('translate-x-full');
    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 5000);
}