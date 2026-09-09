const BASE_URL = (window.location.protocol.startsWith('http')) ? window.location.origin : 'http://localhost:3000';
const loading = document.getElementById('global-loading');

// Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: var(--panel-bg);
        backdrop-filter: blur(10px);
        border-left: 4px solid ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        color: white;
        margin-top: 10px;
        animation: slideIn 0.3s forwards;
    `;
    toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Inline styles for toast animation
const style = document.createElement('style');
style.innerHTML = `@keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
document.head.appendChild(style);

function showLoading(show) {
    if (show) loading.classList.add('active');
    else loading.classList.remove('active');
}

function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại');
        
        // Save to local storage
        localStorage.setItem('admin_token', data.token || 'logged_in');
        localStorage.setItem('admin_username', username);
        
        showToast('Đăng nhập thành công! Đang chuyển hướng...');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1000);
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const secret = document.getElementById('reg-secret').value;
    
    // Hardcoded secret check to prevent random users from registering
    if (secret !== 'admin') {
        showToast('Mã bảo vệ không chính xác!', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại');
        
        showToast('Đăng ký thành công! Hãy đăng nhập.');
        document.getElementById('register-form').reset();
        switchTab('login');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
});
