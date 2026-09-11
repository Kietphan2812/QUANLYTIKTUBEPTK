
// ============================================
// ADMIN APP BADGE & WINDOWS NOTIFICATIONS
// ============================================
function updateAdminAppBadge(count) {
    const num = Number(count) || 0;
    if ('setAppBadge' in navigator) {
        if (num > 0) {
            navigator.setAppBadge(num).catch(e => console.warn('setAppBadge error:', e));
        } else {
            navigator.clearAppBadge().catch(e => console.warn('clearAppBadge error:', e));
        }
    }
}

function showAdminDesktopNotification(title, body) {
    if (!('Notification' in window)) return;
    const trigger = () => {
        try {
            const notif = new Notification(title || 'TIKTUBE Quản Trị', {
                body: body || 'Có thông báo quản trị mới!',
                icon: 'icon-192.png',
                badge: 'icon-192.png'
            });
            notif.onclick = () => {
                window.focus();
                notif.close();
            };
        } catch (e) {
            console.warn('Desktop notif error:', e);
        }
    };

    if (Notification.permission === 'granted') {
        trigger();
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') trigger();
        });
    }
}

// Tự động xin quyền thông báo khi nhấp chuột
if ('Notification' in window && Notification.permission === 'default') {
    document.addEventListener('click', function askPerm() {
        Notification.requestPermission();
        document.removeEventListener('click', askPerm);
    }, { once: true });
}

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
let allVideos = [];
let currentFilter = 'all';

// DOM Elements
const tbody = document.getElementById('video-table-body');
const totalVideosEl = document.getElementById('total-videos');
const dbStatusEl = document.getElementById('db-status');
const modal = document.getElementById('video-modal');
const form = document.getElementById('video-form');
const searchInput = document.getElementById('search-input');
const loading = document.getElementById('global-loading');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchVideos();
    initAdminSocket();
    
    // Add Search Listener
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allVideos.filter(v => 
            (v.title && v.title.toLowerCase().includes(term)) || 
            (v.description && v.description.toLowerCase().includes(term))
        );
        renderTable(filtered);
    });
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

// Fetch Data
async function fetchVideos() {
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/admin/videos`);
        if (!res.ok) throw new Error('Network error or server down');
        const data = await res.json();
        allVideos = data;
        renderTable(data);
        dbStatusEl.textContent = 'Đã kết nối';
        dbStatusEl.style.color = 'var(--success)';
    } catch (err) {
        console.error(err);
        dbStatusEl.textContent = 'Mất kết nối';
        dbStatusEl.style.color = 'var(--danger)';
        showToast('Không thể kết nối đến SQL Server: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Render Table
function renderTable(data) {
    // Cập nhật số thông báo đỏ trên icon App Quản Trị (PWA)
    const pendingTotal = data.filter(v => (v.trang_thai === 'cho_duyet' || Number(v.so_bao_cao) > 0)).length;
    updateAdminAppBadge(pendingTotal);
    const tbody = document.getElementById('video-table-body');
    tbody.innerHTML = '';
    
    // Apply filter
    const filteredData = data.filter(video => {
        const status = video.trang_thai || video.Trang_thai || 'cho_duyet';
        if (currentFilter === 'all') return true;
        return status === currentFilter;
    });

    totalVideosEl.textContent = filteredData.length;

    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Không có video nào</td></tr>';
        return;
    }

    filteredData.forEach(video => {
        const tr = document.createElement('tr');
        
        // Use default thumbnail if none provided
        let thumbStr = video.duong_dan_anh_bia || video.thumbnail || video.Thumbnail || 'https://via.placeholder.com/150x84?text=No+Thumb';
        if (!thumbStr.startsWith('http') && thumbStr !== 'https://via.placeholder.com/150x84?text=No+Thumb') {
            thumbStr = thumbStr.startsWith('/') ? `${BASE_URL}${thumbStr}` : `${BASE_URL}/${thumbStr}`;
        }
        const defaultThumb = 'https://via.placeholder.com/150x84?text=No+Thumb';
        
        const status = video.trang_thai || video.Trang_thai || 'cho_duyet';
        const isApproved = status === 'da_duyet';
        const isRejected = status === 'tu_choi';
        
        const reason = video.ly_do_kiem_duyet || '';
        let statusHtml = '';
        if (isApproved) {
            const isAuto = reason.includes('tự động') || reason.includes('AutoMod') || reason.includes('an toàn');
            statusHtml = `<div style="display:flex; flex-direction:column; gap:4px;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: ${isAuto ? '#16a34a' : '#22c55e'}; color: #fff; width: fit-content;">
                    <i class="fa-solid ${isAuto ? 'fa-robot' : 'fa-check'}"></i> ${isAuto ? 'Đã duyệt tự động' : 'Đã duyệt'}
                </span>
                ${reason ? `<span style="font-size: 11px; color: #64748b;" title="${reason}">${reason.slice(0, 35)}${reason.length > 35 ? '...' : ''}</span>` : ''}
            </div>`;
        } else if (isRejected) {
            statusHtml = `<div style="display:flex; flex-direction:column; gap:4px;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #ef4444; color: #fff; width: fit-content;">
                    <i class="fa-solid fa-ban"></i> Từ chối
                </span>
                ${reason ? `<span style="font-size: 11px; color: #ef4444;" title="${reason}">${reason.slice(0, 35)}${reason.length > 35 ? '...' : ''}</span>` : ''}
            </div>`;
        } else {
            const isFlagged = reason.includes('Cảnh báo') || reason.includes('Phát hiện') || reason.includes('18+') || reason.includes('nhạy cảm') || reason.includes('thô tục') || reason.includes('kinh dị');
            if (isFlagged) {
                statusHtml = `<div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #b91c1c; color: #fff; width: fit-content; box-shadow: 0 0 6px rgba(185,28,28,0.4);">
                        <i class="fa-solid fa-triangle-exclamation"></i> Chặn tự động (Nghi vấn)
                    </span>
                    <span style="font-size: 11px; color: #991b1b; background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-weight: 500;" title="${reason}">
                        ${reason}
                    </span>
                </div>`;
            } else {
                statusHtml = `<div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #fbbf24; color: #000; width: fit-content;">
                        <i class="fa-solid fa-clock"></i> Chờ duyệt
                    </span>
                    ${reason ? `<span style="font-size: 11px; color: #64748b;" title="${reason}">${reason.slice(0, 35)}${reason.length > 35 ? '...' : ''}</span>` : ''}
                </div>`;
            }
        }

        let videoUrl = video.duong_dan_video || video.url || '#';
        if (!videoUrl.startsWith('http') && videoUrl !== '#') {
            // Prepend BASE_URL to load from the actual backend
            videoUrl = videoUrl.startsWith('/') ? `${BASE_URL}${videoUrl}` : `${BASE_URL}/${videoUrl}`;
        }

        tr.innerHTML = `
            <td>#${video.video_id || video.id || '?'}</td>
            <td><img src="${thumbStr}" class="thumb-preview" alt="thumbnail" onerror="this.src='${defaultThumb}'"></td>
            <td>
                <span class="video-title">${video.tieu_de || video.title || 'Không có tiêu đề'}</span>
                ${Number(video.so_bao_cao) > 0 ? `<span style="display:inline-block; font-size:11px; font-weight:700; color:#b91c1c; background:#fee2e2; border:1px solid #fca5a5; border-radius:4px; padding:2px 6px; margin-left:6px;"><i class="fa-solid fa-flag"></i> ${video.so_bao_cao} báo cáo vi phạm</span>` : ''}
                <span class="video-desc">${video.mo_ta || video.description || 'Không có mô tả'}</span>
            </td>
            <td><strong>${video.nguoi_dang || 'Ẩn danh'}</strong></td>
            <td><a href="${videoUrl}" target="_blank" style="color: var(--primary); text-decoration: none;"><i class="fa-solid fa-play"></i> Xem video</a></td>
            <td>${statusHtml}</td>
            <td>
                <div class="action-btns" style="display:flex; flex-wrap:wrap; gap:5px;">
                    ${status !== 'da_duyet' ? `<button class="btn btn-primary" onclick="updateStatus(${video.video_id || video.id}, 'da_duyet')" title="Duyệt cho đăng"><i class="fa-solid fa-check"></i></button>` : ''}
                    ${status !== 'tu_choi' ? `<button class="btn btn-danger" onclick="updateStatus(${video.video_id || video.id}, 'tu_choi')" title="Từ chối"><i class="fa-solid fa-ban"></i></button>` : ''}
                    <button class="btn btn-edit" onclick='editVideo(${JSON.stringify(video).replace(/'/g, "&#39;")})' title="Sửa"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger" onclick="deleteVideo(${video.video_id || video.id})" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Modal Management
function openModal(isEdit = false) {
    document.getElementById('modal-title').textContent = isEdit ? 'Sửa Video' : 'Thêm Video Mới';
    if (!isEdit) {
        form.reset();
        document.getElementById('video-id').value = '';
    }
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

// Form Submission (Add/Update)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('video-id').value;
    const isEdit = !!id;
    
    const payload = {
        title: document.getElementById('title').value,
        url: document.getElementById('url').value,
        thumbnail: document.getElementById('thumbnail').value,
        description: document.getElementById('description').value
    };
    
    showLoading(true);
    try {
        const url = isEdit ? `${BASE_URL}/api/videos/${id}` : `${BASE_URL}/api/videos`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Thao tác thất bại');
        }
        
        showToast(isEdit ? 'Đã cập nhật video' : 'Đã thêm video thành công');
        closeModal();
        fetchVideos();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
});

// Edit Video
window.editVideo = function(video) {
    document.getElementById('video-id').value = video.video_id || video.id || video.Id;
    document.getElementById('title').value = video.tieu_de || video.title || video.Title || '';
    document.getElementById('url').value = video.duong_dan_video || video.url || video.Url || '';
    document.getElementById('thumbnail').value = video.duong_dan_anh_bia || video.thumbnail || video.Thumbnail || '';
    document.getElementById('description').value = video.mo_ta || video.description || video.Description || '';
    openModal(true);
};

// Delete Video
window.deleteVideo = async function(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa video này? Hành động này không thể hoàn tác.')) return;
    
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/videos/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Không thể xóa video');
        
        showToast('Đã xóa video', 'success');
        fetchVideos();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
};

// Loading Indicator
function showLoading(show) {
    if (show) loading.classList.add('active');
    else loading.classList.remove('active');
}

// Update Video Status (Approve/Reject)
window.updateStatus = async function(id, status) {
    let ly_do = '';
    if (status === 'da_duyet') {
        if (!confirm('Chấp thuận đăng video này?')) return;
    } else if (status === 'tu_choi') {
        ly_do = prompt('Vui lòng nhập lý do từ chối video này:');
        if (ly_do === null) return; // User cancelled
    }
    
    const admin_username = localStorage.getItem('admin_username') || 'Admin';
    
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/videos/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trang_thai: status, ly_do, admin_username })
        });
        
        if (!res.ok) throw new Error('Không thể cập nhật trạng thái video');
        
        showToast('Đã cập nhật trạng thái thành công', 'success');
        fetchVideos();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
};

// Event Listeners for Filters
document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.getAttribute('data-status');
                renderTable(allVideos);
            });
        });
    }
});

// ==========================================
// REAL-TIME SYNC VIA SOCKET.IO
// ==========================================
let adminSocket = null;
function initAdminSocket() {
    if (typeof io === 'undefined') return;
    try {
        const socketHost = BASE_URL.includes('localhost') ? BASE_URL : 'https://tiktubeptk.onrender.com';
        adminSocket = io(socketHost);
        adminSocket.on('connect', () => {
            console.log('⚡ Admin Realtime Connected via Socket.IO');
        });
        
        // Khi có người dùng upload video mới lên
        adminSocket.on('newVideoUploaded', (data) => {
            console.log('⚡ [Realtime] Video mới tải lên:', data);
            if (data.status === 'da_duyet' || data.isClean) {
                showToast(`🤖 Video mới đã được TỰ ĐỘNG DUYỆT: "${data.video?.Title || 'Video'}"`, 'success');
            } else {
                showToast(`⚠️ CẢNH BÁO: Video mới bị giữ lại do nghi vấn: ${data.reason || 'Cần kiểm duyệt'}`, 'error');
                showAdminDesktopNotification('TIKTUBE Quản Trị - Video mới', `⚠️ Có video mới cần duyệt: "${data.video?.Title || 'Video mới'}" - ${data.reason || ''}`);
            }
            fetchVideos();
        });

        // Khi có người xem gửi báo cáo vi phạm video
        adminSocket.on('videoReported', (data) => {
            console.log('🚨 [Report Alert]', data);
            const hiddenNote = data.autoHidden ? ' ⛔ ĐÃ TỰ ĐỘNG TẠM ẨN KHỎI TRANG CHỦ!' : '';
            showToast(`🚨 BÁO CÁO VI PHẠM: Video "${data.title}" bị phản ánh: ${data.reason} (${data.totalReports} lượt).${hiddenNote}`, 'error');
            showAdminDesktopNotification('🚨 BÁO CÁO VI PHẠM KHẨN CẤP', `Video "${data.title}" bị báo cáo vì: ${data.reason} (${data.totalReports} lượt).${hiddenNote}`);
            fetchVideos();
        });

        // Khi trạng thái duyệt thay đổi
        adminSocket.on('videoStatusChanged', () => {
            fetchVideos();
        });
    } catch (e) {
        console.warn('Admin socket init error:', e.message);
    }
}
