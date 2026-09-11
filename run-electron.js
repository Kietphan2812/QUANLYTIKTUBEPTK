const { spawn } = require('child_process');
const electronPath = require('electron');
const path = require('path');

const mainScript = path.join(__dirname, 'main-electron.js');

console.log('🚀 Khởi động TIKTUBE Quản Trị Desktop App...');

const child = spawn(electronPath, [mainScript], {
  stdio: 'inherit',
  windowsHide: false
});

child.on('close', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Lỗi khởi động Electron:', err);
  process.exit(1);
});
