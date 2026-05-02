import { app, BrowserWindow, shell, ipcMain, dialog, Notification, Menu, screen } from 'electron';
import * as path from 'path';
import { getLoadURL, isDev } from './config';
import { getSavedWindowState, trackWindowState } from './window-state';
import { createTray, destroyTray } from './tray';
import { initAutoUpdater, checkForUpdates } from './updater';
import { getOfflineHTML } from './offline';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const windowState = getSavedWindowState();

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 900,
    minHeight: 600,
    title: 'Lumio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    show: false,
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  trackWindowState(mainWindow);

  const loadURL = getLoadURL();
  mainWindow.loadURL(loadURL);

  // Show offline page if server is unreachable
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _errorDesc, validatedURL) => {
    // Ignore aborted loads (user navigated away) and subframe errors
    if (errorCode === -3) return;
    if (validatedURL === loadURL || validatedURL === loadURL + '/') {
      mainWindow?.webContents.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(getOfflineHTML(loadURL))}`
      );
    }
  });

  // Show window when content is ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Native save dialog for file downloads (PDF, Excel, etc.)
  mainWindow.webContents.session.on('will-download', (_event, item) => {
    const filename = item.getFilename();
    const ext = path.extname(filename).toLowerCase();
    const filters: Electron.FileFilter[] = [];

    if (ext === '.pdf') {
      filters.push({ name: 'PDF Documents', extensions: ['pdf'] });
    } else if (ext === '.xlsx' || ext === '.xls') {
      filters.push({ name: 'Excel Spreadsheets', extensions: ['xlsx', 'xls'] });
    } else if (ext === '.csv') {
      filters.push({ name: 'CSV Files', extensions: ['csv'] });
    }

    if (mainWindow) {
      const savePath = dialog.showSaveDialogSync(mainWindow, {
        defaultPath: filename,
        filters: filters.length > 0 ? filters : undefined,
      });
      if (savePath) {
        item.setSavePath(savePath);
      } else {
        item.cancel();
      }
    }
  });

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appURL = getLoadURL();
    if (!url.startsWith(appURL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpcHandlers(): void {
  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('resize-for-onboarding-integration', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed() || win.isMaximized() || win.isFullScreen()) {
      return false;
    }

    const bounds = win.getBounds();
    const workArea = screen.getDisplayMatching(bounds).workArea;
    const width = Math.min(1280, workArea.width);
    const height = Math.min(900, workArea.height);
    const x = Math.round(workArea.x + (workArea.width - width) / 2);
    const y = Math.round(workArea.y + (workArea.height - height) / 2);

    win.setBounds({ x, y, width, height }, true);
    return true;
  });

  ipcMain.on('show-notification', (_event, { title, body }: { title: string; body: string }) => {
    new Notification({ title, body }).show();
  });

  ipcMain.on('check-for-updates', () => {
    checkForUpdates();
  });
}

function handleDeepLink(url: string): void {
  // lumio://path/to/page → navigate BrowserWindow
  const parsed = new URL(url);
  if (parsed.protocol === 'lumio:') {
    const route = parsed.pathname || '/';
    mainWindow?.webContents.loadURL(`${getLoadURL()}${route}`);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  }
}

// Register lumio:// protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('lumio', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('lumio');
}

// Single instance lock + deep link handling
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Windows/Linux: deep link URL comes as last argv
    const deepLinkUrl = argv.find((arg) => arg.startsWith('lumio://'));
    if (deepLinkUrl) handleDeepLink(deepLinkUrl);
  });

  // macOS: deep link via open-url event
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow) {
      handleDeepLink(url);
    }
  });
}

app.on('ready', () => {
  createApplicationMenu();
  registerIpcHandlers();
  createWindow();
  createTray(() => mainWindow);
  initAutoUpdater(() => mainWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  destroyTray();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.setAboutPanelOptions({
  applicationName: 'Lumio',
  applicationVersion: app.getVersion(),
  copyright: '© 2024-2026 Lumio',
});

export { mainWindow };
