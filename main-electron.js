const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;

// Đặt Application ID riêng cho Admin
app.setAppUserModelId('com.tiktube.admin');

function checkServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/admin.html`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      const reqRoot = http.get(`http://localhost:${port}`, (res2) => {
        resolve(true);
      });
      reqRoot.on('error', () => resolve(false));
      reqRoot.setTimeout(1000, () => {
        reqRoot.destroy();
        resolve(false);
      });
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureBackendServer() {
  const isRunning = await checkServerRunning(PORT);
  if (!isRunning) {
    console.log(`[Electron Admin] Khởi chạy backend Quản trị trên port ${PORT}...`);
    serverProcess = fork(path.join(__dirname, 'server.js'), [], {
      env: { ...process.env, PORT: String(PORT) },
      silent: false
    });

    serverProcess.on('error', (err) => {
      console.error('[Electron Admin] Backend error:', err);
    });

    await new Promise(r => setTimeout(r, 2500));
  } else {
    console.log(`[Electron Admin] Backend Quản trị đã chạy trên port ${PORT}.`);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icon-512.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 950,
    minHeight: 650,
    title: 'TIKTUBE Quản Trị - Bảng Điều Khiển Admin',
    icon: iconPath,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  mainWindow.loadURL(`http://localhost:${PORT}/admin.html`).catch(() => {
    mainWindow.loadFile(path.join(__dirname, 'admin.html'));
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.includes(`localhost:${PORT}`)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  const menuTemplate = [
    {
      label: 'TIKTUBE Quản Trị',
      submenu: [
        { label: 'Về TIKTUBE Quản Trị', role: 'about' },
        { type: 'separator' },
        { label: 'Thoát ứng dụng', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Điều hướng',
      submenu: [
        { label: 'Quay lại', accelerator: 'Alt+Left', click: () => mainWindow.webContents.canGoBack() && mainWindow.webContents.goBack() },
        { label: 'Tiến lên', accelerator: 'Alt+Right', click: () => mainWindow.webContents.canGoForward() && mainWindow.webContents.goForward() },
        { type: 'separator' },
        { label: 'Bảng Điều Khiển (Admin)', click: () => mainWindow.loadURL(`http://localhost:${PORT}/admin.html`) },
        { label: 'Thống Kê (Stats)', click: () => mainWindow.loadURL(`http://localhost:${PORT}/stats.html`) },
        { label: 'Quản Lý Người Dùng', click: () => mainWindow.loadURL(`http://localhost:${PORT}/users.html`) },
        { type: 'separator' },
        { label: 'Tải lại trang', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() }
      ]
    },
    {
      label: 'Hiển thị',
      submenu: [
        { label: 'Phóng to', role: 'zoomIn' },
        { label: 'Thu nhỏ', role: 'zoomOut' },
        { label: 'Mặc định', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Toàn màn hình', role: 'togglefullscreen' },
        { label: 'DevTools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await ensureBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (_) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
