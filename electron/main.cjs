const { app, BrowserWindow, shell, dialog } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let server;
app.whenReady().then(() => {
  const base = path.join(__dirname, '..', 'web');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
  server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost:18765');
    let file;
    try { file = path.resolve(base, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)); } catch { res.writeHead(400).end(); return; }
    if (!file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, content) => { if (error) { res.writeHead(404).end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(content); });
  });
  server.on('error', () => { dialog.showErrorBox('عرش الهندسة', 'تعذر تشغيل التطبيق؛ أغلق النسخة المفتوحة وحاول مجددًا.'); app.quit(); });
  server.listen(18765, '127.0.0.1', () => {
    const window = new BrowserWindow({ width: 1280, height: 900, minWidth: 360, minHeight: 600, autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
    window.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('https://')) shell.openExternal(url); return { action: 'deny' }; });
    window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== 'http://127.0.0.1:18765') event.preventDefault(); });
    window.loadURL('http://127.0.0.1:18765');
  });
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => server?.close());