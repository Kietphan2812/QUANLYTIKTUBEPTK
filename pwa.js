// ============================================
// PWA INSTALLATION SYSTEM - TIKTUBE QUẢN TRỊ
// ============================================

let deferredInstallPrompt = null;

// 1. Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('✅ Admin PWA Service Worker registered'))
            .catch(err => console.warn('PWA SW registration failed:', err));
    });
}

// 2. Capture install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById('adminPwaInstallBtn');
    if (btn) btn.style.display = 'inline-flex';
    console.log('📱 Admin PWA installation ready');
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const btn = document.getElementById('adminPwaInstallBtn');
    if (btn) btn.style.display = 'none';
    closePwaModal();
    alert('🎉 Cài đặt ứng dụng Quản Trị TIKTUBE thành công! Bạn có thể mở trực tiếp từ màn hình chính.');
});

// 3. Trigger direct installation
async function triggerPwaInstall() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        deferredInstallPrompt = null;
    } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);
        
        if (isIOS) {
            switchPwaTab('ios');
        } else if (isAndroid) {
            switchPwaTab('android');
        } else {
            switchPwaTab('pc');
        }
    }
}

// 4. Modal UI Logic
function openPwaModal() {
    const modal = document.getElementById('pwaModal');
    if (!modal) return;
    modal.style.display = 'flex';
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
        switchPwaTab('ios');
    } else if (isAndroid) {
        switchPwaTab('android');
    } else {
        switchPwaTab('pc');
    }
}

function closePwaModal() {
    const modal = document.getElementById('pwaModal');
    if (modal) modal.style.display = 'none';
}

function switchPwaTab(tab) {
    document.querySelectorAll('.pwa-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.pwa-tab-content').forEach(content => content.style.display = 'none');
    
    const targetBtn = document.getElementById(`pwaTabBtn_${tab}`);
    const targetContent = document.getElementById(`pwaTabContent_${tab}`);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetContent) targetContent.style.display = 'block';
}

// 5. Inject CSS Styles and PWA UI Elements
const pwaStyles = `
/* PWA Button in Header */
.admin-pwa-install-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    color: #ffffff !important;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 9999px;
    padding: 8px 16px;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-decoration: none;
    outline: none;
}
.admin-pwa-install-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
    filter: brightness(1.1);
}
.admin-pwa-install-btn:active {
    transform: translateY(0);
}

/* Modal Overlay */
.pwa-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: pwaFadeIn 0.25s ease-out;
}

@keyframes pwaFadeIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
}

.pwa-modal-card {
    background: #141724;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    max-width: 520px;
    width: 100%;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    overflow: hidden;
    color: #f8fafc;
}

.pwa-modal-header {
    padding: 20px 24px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.pwa-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.pwa-title {
    font-size: 17px;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
}

.pwa-subtitle {
    font-size: 12.5px;
    color: #94a3b8;
    margin: 2px 0 0;
}

.pwa-close-btn {
    background: rgba(255, 255, 255, 0.06);
    border: none;
    color: #94a3b8;
    font-size: 24px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}
.pwa-close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
}

/* Tabs */
.pwa-tabs {
    display: flex;
    background: rgba(255, 255, 255, 0.04);
    padding: 6px;
    gap: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.pwa-tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    padding: 10px 8px;
    font-size: 13.5px;
    font-weight: 600;
    color: #94a3b8;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
}
.pwa-tab-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
}
.pwa-tab-btn.active {
    background: #6366f1;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.pwa-tab-content {
    padding: 20px 24px;
}

.pwa-step-box {
    margin-bottom: 16px;
    color: #e2e8f0;
    font-size: 14px;
}

.pwa-badge {
    background: #6366f1;
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    margin-right: 6px;
}

.pwa-badge-sub {
    background: rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    margin-right: 6px;
}

.pwa-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    margin-top: 10px;
    padding: 13px 18px;
    background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 14.5px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    transition: all 0.2s;
}
.pwa-action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
}

.pwa-instruction-box {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 13.5px;
    color: #cbd5e1;
}
.pwa-instruction-box ul {
    margin: 10px 0 0;
    padding-left: 18px;
}
.pwa-instruction-box li {
    margin-bottom: 8px;
    line-height: 1.5;
}

.pwa-modal-footer {
    padding: 12px 24px 18px;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.pwa-close-footer-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e1;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 8px 18px;
    border-radius: 10px;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.pwa-close-footer-btn:hover {
    background: rgba(255, 255, 255, 0.16);
    color: white;
}
`;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject Styles
    const styleEl = document.createElement('style');
    styleEl.innerHTML = pwaStyles;
    document.head.appendChild(styleEl);

    // 2. Inject Install Button into Header or User Profile
    const header = document.querySelector('.header') || document.querySelector('header');
    if (header && !document.getElementById('adminPwaInstallBtn')) {
        const btn = document.createElement('button');
        btn.id = 'adminPwaInstallBtn';
        btn.className = 'admin-pwa-install-btn';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Tải App Quản Trị</span>
        `;
        btn.onclick = openPwaModal;
        
        const userProfile = header.querySelector('.user-profile');
        if (userProfile) {
            userProfile.style.display = 'flex';
            userProfile.style.alignItems = 'center';
            userProfile.style.gap = '12px';
            userProfile.insertBefore(btn, userProfile.firstChild);
        } else {
            header.appendChild(btn);
        }
    }

    // 3. Inject Modal into body
    if (!document.getElementById('pwaModal')) {
        const modal = document.createElement('div');
        modal.id = 'pwaModal';
        modal.className = 'pwa-modal-overlay';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="pwa-modal-card">
                <div class="pwa-modal-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="pwa-icon-box">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </div>
                        <div>
                            <h3 class="pwa-title">Cài đặt App Quản Trị TIKTUBE</h3>
                            <p class="pwa-subtitle">Quản lý video & người dùng mượt mà trên PC, Android & iPhone</p>
                        </div>
                    </div>
                    <button class="pwa-close-btn" onclick="closePwaModal()">&times;</button>
                </div>

                <!-- Tabs -->
                <div class="pwa-tabs">
                    <button id="pwaTabBtn_pc" class="pwa-tab-btn active" onclick="switchPwaTab('pc')">
                        💻 Máy tính
                    </button>
                    <button id="pwaTabBtn_android" class="pwa-tab-btn" onclick="switchPwaTab('android')">
                        🤖 Android
                    </button>
                    <button id="pwaTabBtn_ios" class="pwa-tab-btn" onclick="switchPwaTab('ios')">
                        🍎 iPhone (iOS)
                    </button>
                </div>

                <!-- Tab 1: PC -->
                <div id="pwaTabContent_pc" class="pwa-tab-content">
                    <div class="pwa-step-box">
                        <span class="pwa-badge">Cách 1</span> <strong>Cài đặt nhanh:</strong>
                        <button class="pwa-action-btn" onclick="triggerPwaInstall()">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Cài đặt Ứng dụng lên Máy tính
                        </button>
                    </div>

                    <div class="pwa-instruction-box">
                        <span class="pwa-badge-sub">Cách 2</span> <strong>Cài từ thanh địa chỉ trình duyệt:</strong>
                        <ul>
                            <li>Trên <strong>Chrome / Edge / Cốc Cốc</strong>: Bấm biểu tượng <strong>🖥️ Cài đặt ứng dụng</strong> ở cuối thanh địa chỉ URL.</li>
                            <li>Hoặc mở Menu <strong>⋮ (3 chấm)</strong> &rarr; <strong>Lưu và chia sẻ &rarr; Cài đặt Quản Trị TIKTUBE...</strong></li>
                        </ul>
                    </div>
                </div>

                <!-- Tab 2: Android -->
                <div id="pwaTabContent_android" class="pwa-tab-content" style="display:none;">
                    <div class="pwa-step-box">
                        <span class="pwa-badge">Cách 1</span> <strong>Cài đặt nhanh:</strong>
                        <button class="pwa-action-btn" onclick="triggerPwaInstall()">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Cài đặt lên Điện thoại Android
                        </button>
                    </div>

                    <div class="pwa-instruction-box">
                        <span class="pwa-badge-sub">Cách 2</span> <strong>Thêm qua trình duyệt Chrome:</strong>
                        <ul>
                            <li>Bấm biểu tượng <strong>3 chấm ⋮</strong> ở góc trên bên phải.</li>
                            <li>Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào màn hình chính"</strong>.</li>
                        </ul>
                    </div>
                </div>

                <!-- Tab 3: iPhone (iOS) -->
                <div id="pwaTabContent_ios" class="pwa-tab-content" style="display:none;">
                    <div class="pwa-instruction-box" style="margin-top: 5px;">
                        <span class="pwa-badge">Hướng dẫn</span> <strong>Cài đặt trên Safari (iPhone / iPad):</strong>
                        <ol style="margin-top: 12px; padding-left: 20px; line-height: 1.8;">
                            <li>Mở trang này bằng trình duyệt <strong>Safari</strong>.</li>
                            <li>Bấm nút <strong>Chia sẻ 📤</strong> ở thanh công cụ dưới cùng.</li>
                            <li>Chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.</li>
                            <li>Bấm <strong>"Thêm" (Add)</strong> để hoàn tất.</li>
                        </ol>
                    </div>
                </div>

                <div class="pwa-modal-footer">
                    <button class="pwa-close-footer-btn" onclick="closePwaModal()">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closePwaModal();
        });
    }
});
