// Main Application File - Shared Utilities

// Initialize Lucide icons on page load
document.addEventListener('DOMContentLoaded', function() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Toast notification function
function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    if (!toast || !toastTitle || !toastMessage || !toastIcon) return;
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // Set icon and colors based on type
    toastIcon.className = 'w-8 h-8 rounded-full flex items-center justify-center shrink-0';
    if (type === 'success') {
        toastIcon.className += ' bg-green-100 text-green-600';
        toastIcon.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5"></i>';
    } else if (type === 'error') {
        toastIcon.className += ' bg-red-100 text-red-600';
        toastIcon.innerHTML = '<i data-lucide="x-circle" class="w-5 h-5"></i>';
    } else if (type === 'warning') {
        toastIcon.className += ' bg-amber-100 text-amber-600';
        toastIcon.innerHTML = '<i data-lucide="alert-triangle" class="w-5 h-5"></i>';
    } else {
        toastIcon.className += ' bg-blue-100 text-blue-600';
        toastIcon.innerHTML = '<i data-lucide="info" class="w-5 h-5"></i>';
    }
    
    lucide.createIcons();
    
    toast.classList.remove('translate-x-full');
    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 5000);
}

// Search functionality for clients table
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchClients');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#clientsTableBody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
});

// Password toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            
            // Update icon
            const icon = this.querySelector('i');
            if (type === 'password') {
                icon.setAttribute('data-lucide', 'eye');
            } else {
                icon.setAttribute('data-lucide', 'eye-off');
            }
            lucide.createIcons();
        });
    }
});