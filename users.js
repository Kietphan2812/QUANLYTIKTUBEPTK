// ====== AUTHENTICATION CHECK ======
if (!localStorage.getItem('admin_token')) {
    window.location.href = 'auth.html';
}

// Check for UI username update
document.addEventListener('DOMContentLoaded', () => {
    const userProfile = document.querySelector('.user-profile');
    if (userProfile && localStorage.getItem('admin_username')) {
        const username = localStorage.getItem('admin_username');
        const initial = username.charAt(0).toUpperCase();
        userProfile.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 500;">Xin chào, ${username}</span>
                <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: Outfit;">
                    ${initial}
                </div>
                <button onclick="logoutAdmin()" class="btn btn-danger" style="padding: 0.5rem; margin-left: 10px;"><i class="fa-solid fa-right-from-bracket"></i></button>
            </div>
        `;
    }
});

// Logout function
window.logoutAdmin = function() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    window.location.href = 'auth.html';
};
// ==================================

// API Configuration
const BASE_URL = (window.location.protocol.startsWith('http')) ? window.location.origin : 'http://localhost:3000';
let allUsers = [];

// DOM Elements
const tbody = document.getElementById('user-table-body');
const loading = document.getElementById('global-loading');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
});

// Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Loading Indicator
function showLoading(show) {
    if (show) loading.classList.add('active');
    else loading.classList.remove('active');
}

// Fetch Data
async function fetchUsers() {
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/admin/users`);
        if (!res.ok) throw new Error('Network error or server down');
        const data = await res.json();
        allUsers = data;
        renderTable(data);
    } catch (err) {
        console.error(err);
        showToast('Không thể kết nối đến SQL Server: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Render Table
function renderTable(data) {
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Không có người dùng nào</td></tr>';
        return;
    }

    data.forEach(user => {
        const tr = document.createElement('tr');
        
        const avatarStr = user.anh_dai_dien || 'https://ui-avatars.com/api/?name=' + user.ten_dang_nhap + '&background=random';
        const dateStr = new Date(user.ngay_tao).toLocaleDateString('vi-VN', {
            hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric'
        });

        tr.innerHTML = `
            <td>#${user.nguoi_dung_id}</td>
            <td><img src="${avatarStr}" class="thumb-preview" alt="avatar" style="width:40px; height:40px; border-radius:50%; object-fit:cover;"></td>
            <td><strong>${user.ten_dang_nhap}</strong></td>
            <td>${user.email}</td>
            <td>${dateStr}</td>
            <td>
                <button class="btn btn-primary" onclick="resetPassword(${user.nguoi_dung_id}, '${user.ten_dang_nhap}')" title="Reset Mật khẩu">
                    <i class="fa-solid fa-key"></i> Đặt lại mật khẩu (123456)
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Reset Password
window.resetPassword = async function(id, username) {
    if (!confirm(`Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản "${username}" về mặc định "123456" không?`)) {
        return;
    }
    
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/admin/users/${id}/reset-password`, {
            method: 'PUT'
        });
        
        if (!res.ok) throw new Error('Không thể đặt lại mật khẩu');
        
        showToast(`Đã đặt lại mật khẩu cho ${username} thành "123456" thành công!`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
};
