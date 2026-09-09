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
            </div>
        `;
    }
});

// API Configuration
const BASE_URL = (window.location.protocol.startsWith('http')) ? window.location.origin : 'http://localhost:3000';

// DOM Elements
const viewsEl = document.getElementById('stat-total-views');
const likesEl = document.getElementById('stat-total-likes');
const commentsEl = document.getElementById('stat-total-comments');
const loading = document.getElementById('global-loading');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchStats();
});

// Fetch Data
async function fetchStats() {
    showLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/api/admin/stats/overall`);
        if (!res.ok) throw new Error('Network error or server down');
        const data = await res.json();
        
        // Update Totals
        viewsEl.textContent = data.totals.total_views.toLocaleString();
        likesEl.textContent = data.totals.total_likes.toLocaleString();
        commentsEl.textContent = data.totals.total_comments.toLocaleString();
        
        // Render Chart
        renderChart(data.daily);
        
        // Render Video Ranking
        renderVideoRanking(data.videos);
        
    } catch (err) {
        console.error(err);
        showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

let allVideoData = []; // Store fetched videos globally
let currentSort = { column: 'luot_xem', direction: 'desc' };

// Function to render video rankings table
function renderVideoRanking(videos) {
    if (videos) allVideoData = videos;
    const tbody = document.getElementById('video-ranking-body');
    tbody.innerHTML = '';
    
    if (!allVideoData || allVideoData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Chưa có dữ liệu video</td></tr>';
        return;
    }

    // Sort data
    const sortedData = [...allVideoData].sort((a, b) => {
        const valA = a[currentSort.column] || 0;
        const valB = b[currentSort.column] || 0;
        if (currentSort.direction === 'asc') return valA - valB;
        return valB - valA;
    });

    sortedData.forEach(video => {
        const tr = document.createElement('tr');
        
        let thumbUrl = video.duong_dan_anh_bia || 'https://via.placeholder.com/150x84?text=No+Thumb';
        if (!thumbUrl.startsWith('http')) {
            thumbUrl = thumbUrl.startsWith('/') ? `${BASE_URL}${thumbUrl}` : `${BASE_URL}/${thumbUrl}`;
        }

        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${thumbUrl}" style="width: 100px; height: 56px; border-radius: 8px; object-fit: cover; background: #2a2d3e;" onerror="this.src='https://via.placeholder.com/150x84?text=Error'">
                    <div>
                        <div style="font-weight: 600; color: white;">${video.tieu_de || 'Không có tiêu đề'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${video.mo_ta || 'Không có mô tả'}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <span style="font-weight: 500; color: var(--primary);">${video.nguoi_dang || 'Ẩn danh'}</span>
            </td>
            <td style="text-align: center; font-weight: 600; font-family: Outfit;">${(video.luot_xem || 0).toLocaleString()}</td>
            <td style="text-align: center; color: #ec4899; font-weight: 600;">${(video.so_luot_thich || 0).toLocaleString()}</td>
            <td style="text-align: center; color: #f59e0b; font-weight: 600;">${(video.so_binh_luan || 0).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Function to handle table sorting
window.toggleSort = function(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'desc';
    }
    
    // Update icons (optional improvement)
    renderVideoRanking();
};

let myChart; // Global chart instance

// Function to render chart using Chart.js
function renderChart(dailyData) {
    const ctx = document.getElementById('statsChart').getContext('2d');
    
    // Fill gaps to make timeline continuous (60 days)
    const labels = [];
    const views = [];
    const likes = [];
    const comments = [];

    // Build a lookup map from server daily data
    const dailyMap = {};
    (dailyData || []).forEach(item => {
        if (!item || !item.date) return;
        
        // Parse date reliably (avoiding timezone shifts for YYYY-MM-DD strings)
        let dateKey;
        if (typeof item.date === 'string') {
            dateKey = item.date.split('T')[0]; // Works for "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss"
        } else {
            const dt = new Date(item.date);
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            dateKey = `${y}-${m}-${d}`;
        }
        
        dailyMap[dateKey] = {
            views: Number(item.views) || 0,
            likes: Number(item.likes) || 0,
            comments: Number(item.comments) || 0
        };
    });

    const now = new Date();
    // Use a fixed "today" at 00:00:00 to avoid mid-day issues
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start from 59 days ago to today
    for (let i = 59; i >= 0; i--) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() - i);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        labels.push(dateStr);

        const dataPoint = dailyMap[dateStr];
        if (dataPoint) {
            views.push(dataPoint.views);
            likes.push(dataPoint.likes);
            comments.push(dataPoint.comments);
        } else {
            views.push(0);
            likes.push(0);
            comments.push(0);
        }
    }

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Lượt Xem',
                    data: views,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#6366f1'
                },
                {
                    label: 'Lượt Thích',
                    data: likes,
                    borderColor: '#ec4899',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#ec4899'
                },
                {
                    label: 'Bình Luận',
                    data: comments,
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#f59e0b'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // We use custom legends in HTML
                },
                tooltip: {
                    backgroundColor: '#1e2130',
                    titleFont: { family: 'Outfit', size: 14 },
                    bodyFont: { family: 'Inter', size: 13 },
                    padding: 12,
                    boxPadding: 8,
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

// Function to toggle datasets visibility
window.toggleDataset = function(index) {
    if (!myChart) return;
    
    const isVisible = myChart.isDatasetVisible(index);
    const legendItems = document.querySelectorAll('.legend-item');
    
    if (isVisible) {
        myChart.hide(index);
        legendItems[index].style.opacity = '0.3';
        legendItems[index].style.textDecoration = 'line-through';
    } else {
        myChart.show(index);
        legendItems[index].style.opacity = '1';
        legendItems[index].style.textDecoration = 'none';
    }
};

// Utils
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

function showLoading(show) {
    if (show) loading.classList.add('active');
    else loading.classList.remove('active');
}
