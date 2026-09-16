// Electron Main Process for FaceLock Desktop Guard (Windows)
const { app, BrowserWindow, Tray, Menu, ipcMain, powerSaveBlocker, globalShortcut, nativeImage, session, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { exec } = require('child_process');

// Enable Chromium Experimental Web Platform Features & ShapeDetection API
// This allows 100% offline, C++ GPU/CPU native FaceDetector inside Electron without needing external CDNs!
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('enable-blink-features', 'ShapeDetection');
app.commandLine.appendSwitch('allow-file-access-from-files');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('ignore-certificate-errors');

// Stability & Background Running for Windows
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

process.on('uncaughtException', (err) => {
  console.error('[Electron Uncaught Exception]:', err);
});

let mainWindow = null;
let tray = null;
let powerBlockerId = null;

// Determine if in dev mode
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// Ensure single instance lock so only one FaceLock Guard runs
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    title: 'FaceLock Desktop Guard',
    frame: true, // Native Windows 11 frame
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    show: false, // Wait until ready to show to prevent black flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // CRITICAL: Keeps 500ms webcam scan running when hidden/locked
      webSecurity: false, // Prevents CORS errors on file:// protocol for local assets
      allowRunningInsecureContent: true,
    },
  });

  // Show window once ready, with safety timer fallback so it never stays blank/hidden
  let hasShown = false;
  const showSafely = () => {
    if (!hasShown && mainWindow) {
      hasShown = true;
      mainWindow.show();
    }
  };

  mainWindow.once('ready-to-show', showSafely);
  setTimeout(showSafely, 1500);

  // Automatically grant camera permissions for webcam face scanning
  if (mainWindow.webContents.session) {
    mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
      if (permission === 'media' || permission === 'camera') return true;
      return true;
    });

    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(true);
    });
  }

  // Prevent Windows from suspending camera execution in background
  if (powerSaveBlocker) {
    powerBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  }

  // Allow F12 or Ctrl+Shift+I to toggle DevTools for inspection
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Log renderer console messages and errors for easy diagnosis
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer L${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Renderer Process Gone]:', details);
  });

  // Log loading errors if any
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load page:', errorCode, errorDescription, validatedURL);
  });

  // Load URL or dist file
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Find dist/index.html across possible production packaging paths
    const candidates = [
      path.join(__dirname, '../dist/index.html'),
      path.join(app.getAppPath(), 'dist/index.html'),
      path.join(process.resourcesPath, 'app/dist/index.html'),
      path.join(process.resourcesPath, 'app.asar/dist/index.html'),
      path.join(__dirname, 'dist/index.html'),
    ];

    const foundPath = candidates.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });

    if (foundPath) {
      const fileUrl = pathToFileURL(foundPath).toString();
      mainWindow.loadURL(fileUrl).catch((err) => {
        console.error('loadURL failed, trying loadFile:', err);
        mainWindow.loadFile(foundPath);
      });
    } else {
      const fallbackPath = path.join(__dirname, '../dist/index.html');
      const fileUrl = pathToFileURL(fallbackPath).toString();
      mainWindow.loadURL(fileUrl).catch(() => {
        mainWindow.loadFile(fallbackPath);
      });
    }
  }

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon?.({
          title: 'FaceLock Guard',
          content: 'Ứng dụng đang chạy ngầm trong khay hệ thống và tiếp tục quét mỗi 500ms.',
        });
      }
    }
    return false;
  });

  // Handle minimize: hide to tray
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });
}

// System Tray Configuration
function createTray() {
  // Simple cyan 16x16 icon data
  const iconBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQABjS+j4+P2//ffxky/2VjYGBg/Pfv3/8///6yMDAwMDB+/P+fgYGBgYFh1AB6GEAmYMSmCaaLgYEB2UUkO2AUjcJoNAxIAUaM0zAGBkaQW8gGACu+Jhn2B/5eAAAAAElFTkSuQmCC',
    'base64'
  );
  const trayIcon = nativeImage.createFromBuffer(iconBuffer);

  tray = new Tray(trayIcon);
  tray.setToolTip('FaceLock Desktop Guard (Đang quét 500ms)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mở FaceLock Guard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Khóa máy ngay (Win + L)',
      click: () => lockWindowsWorkStation(),
    },
    { type: 'separator' },
    {
      label: 'Thoát ứng dụng',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Native Windows Lock Function
function lockWindowsWorkStation() {
  return new Promise((resolve) => {
    // Windows API LockWorkStation call via rundll32
    exec('rundll32.exe user32.dll,LockWorkStation', (error) => {
      if (error) {
        console.error('Error locking workstation:', error);
        resolve({ success: false, message: error.message });
      } else {
        console.log('WorkStation locked successfully via user32.dll');
        resolve({ success: true });
      }
    });
  });
}

// Bubble Window Reference
let bubbleWindow = null;

function createBubbleWindow() {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    bubbleWindow.show();
    bubbleWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  bubbleWindow = new BrowserWindow({
    width: 220,
    height: 240,
    x: Math.max(0, screenWidth - 240),
    y: Math.min(screenHeight - 260, 100),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      webSecurity: false,
    },
  });

  const bubbleHash = '#bubble';
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    bubbleWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}${bubbleHash}`);
  } else {
    const candidates = [
      path.join(__dirname, '../dist/index.html'),
      path.join(app.getAppPath(), 'dist/index.html'),
      path.join(process.resourcesPath, 'app/dist/index.html'),
      path.join(process.resourcesPath, 'app.asar/dist/index.html'),
      path.join(__dirname, 'dist/index.html'),
    ];
    const foundPath = candidates.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    }) || path.join(__dirname, '../dist/index.html');

    const fileUrl = pathToFileURL(foundPath).toString() + bubbleHash;
    bubbleWindow.loadURL(fileUrl).catch(() => {
      bubbleWindow.loadFile(foundPath, { hash: 'bubble' });
    });
  }

  bubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  bubbleWindow.setAlwaysOnTop(true, 'screen-saver');

  bubbleWindow.on('closed', () => {
    bubbleWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bubble:closed');
    }
  });
}

// IPC Handlers
ipcMain.handle('lock-workstation', async () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
  return await lockWindowsWorkStation();
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('window-restore', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('window-close', () => {
  app.isQuitting = true;
  app.quit();
});

// Independent Floating Desktop Bubble Handlers
ipcMain.on('bubble:show', () => {
  createBubbleWindow();
});

ipcMain.on('bubble:hide', () => {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    bubbleWindow.close();
    bubbleWindow = null;
  }
});

ipcMain.on('bubble:action', (_event, action, payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bubble:action', action, payload);
    if (action === 'restore' || action === 'maximize') {
      mainWindow.show();
      mainWindow.focus();
    }
  }
});

ipcMain.on('bubble:sync-state', (_event, state) => {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    bubbleWindow.webContents.send('bubble:state-update', state);
  }
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Register Global Hotkey for quick lock
  try {
    globalShortcut.register('CommandOrControl+Alt+L', () => {
      lockWindowsWorkStation();
    });
  } catch (e) {
    console.warn('Could not register global shortcut', e);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
    powerSaveBlocker.stop(powerBlockerId);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
