const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();

// ── User data media dirs ───────────────────────────────────────────────────
function getUserDir(sub) {
  const dir = path.join(app.getPath('userData'), sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// On first launch: copy bundled defaults into userData
function initMediaDirs() {
  ['scene', 'sound', '摸鱼'].forEach(sub => {
    const userDir = path.join(app.getPath('userData'), sub);
    const bundleDir = path.join(__dirname, sub);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
      if (fs.existsSync(bundleDir)) {
        try {
          fs.readdirSync(bundleDir).forEach(f => {
            const src = path.join(bundleDir, f);
            if (fs.statSync(src).isFile()) {
              fs.copyFileSync(src, path.join(userDir, f));
            }
          });
        } catch (e) { console.warn('initMediaDirs copy error:', e.message); }
      }
    }
  });
}

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.icns');
  if (process.platform === 'darwin') {
    try { app.dock.setIcon(iconPath); } catch (_) {}
  }

  const win = new BrowserWindow({
    width: 860,
    height: 640,
    minWidth: 720,
    minHeight: 520,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    backgroundColor: '#1a1a2e',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });

  win.loadFile('renderer/index.html');
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  initMediaDirs();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── IPC: media listing ─────────────────────────────────────────────────────
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const AUDIO_EXTS = /\.(mp3|ogg|wav|flac|m4a)$/i;

ipcMain.handle('list-scenes', async () => {
  const dir = getUserDir('scene');
  try {
    return fs.readdirSync(dir).map(f => {
      const ext = path.extname(f).toLowerCase();
      const type = VIDEO_EXTS.has(ext) ? 'video' : IMAGE_EXTS.has(ext) ? 'image' : null;
      return type ? { name: f, path: path.join(dir, f), type } : null;
    }).filter(Boolean);
  } catch { return []; }
});

ipcMain.handle('list-sounds', async () => {
  const dir = getUserDir('sound');
  try {
    return fs.readdirSync(dir)
      .filter(f => AUDIO_EXTS.test(f))
      .map(f => ({ name: f, path: path.join(dir, f) }));
  } catch { return []; }
});

ipcMain.handle('list-moyu', async () => {
  const dir = getUserDir('摸鱼');
  try {
    return fs.readdirSync(dir)
      .filter(f => VIDEO_EXTS.has(path.extname(f).toLowerCase()))
      .map(f => ({ name: f, path: path.join(dir, f) }));
  } catch { return []; }
});

// ── IPC: import files ──────────────────────────────────────────────────────
function copyToDir(sub, sourcePath) {
  const dir = getUserDir(sub);
  const filename = path.basename(sourcePath);
  const dest = path.join(dir, filename);
  try {
    fs.copyFileSync(sourcePath, dest);
    return { ok: true, path: dest, name: filename };
  } catch (e) { return { ok: false, error: e.message }; }
}

ipcMain.handle('copy-sound', async (_, sourcePath) => copyToDir('sound', sourcePath));

ipcMain.handle('copy-scene', async (_, sourcePath) => {
  const result = copyToDir('scene', sourcePath);
  if (result.ok) {
    const ext = path.extname(result.name).toLowerCase();
    result.type = VIDEO_EXTS.has(ext) ? 'video' : IMAGE_EXTS.has(ext) ? 'image' : 'unknown';
  }
  return result;
});

ipcMain.handle('delete-scene', async (_, filePath) => {
  try { fs.unlinkSync(filePath); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('delete-sound', async (_, filePath) => {
  try { fs.unlinkSync(filePath); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

// Show file in Finder
ipcMain.handle('show-in-finder', async (_, sub) => {
  shell.openPath(getUserDir(sub));
});

// ── IPC: store & export ────────────────────────────────────────────────────
ipcMain.handle('store-get', (_, key) => store.get(key));
ipcMain.handle('store-set', (_, key, value) => store.set(key, value));
ipcMain.handle('store-delete', (_, key) => store.delete(key));

ipcMain.handle('export-file', async (_, { content, filename, filters }) => {
  const { filePath, canceled } = await dialog.showSaveDialog({ defaultPath: filename, filters });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, content, 'utf-8');
  return { ok: true, filePath };
});
