// @ts-ignore - Use bare require for electron
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, dialog } = require('electron');
import * as path from 'path';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import { KasaManager } from './kasaManager';
import { AppConfig, LogEntry, SpeakerPlug } from '../shared/types';
import { DEFAULT_CONFIG, SHUTDOWN_GRACE_PERIOD } from '../shared/constants';

// Check for portable mode
const fs = require('fs');
const portablePaths = [
  path.join(app.getAppPath(), 'portable.txt'),
  path.join(path.dirname(app.getPath('exe')), 'portable.txt'),
];
// @ts-ignore - resourcesPath exists in packaged app
if ((process as any).resourcesPath) {
  // @ts-ignore
  portablePaths.push(path.join((process as any).resourcesPath, 'portable.txt'));
}
const isPortable = portablePaths.some(p => fs.existsSync(p));

// Store for persisting app configuration
const store = new Store<{ config: AppConfig; logs: LogEntry[] }>({
  cwd: isPortable ? path.dirname(app.getPath('exe')) : undefined,
  defaults: {
    config: DEFAULT_CONFIG,
    logs: [],
  },
});

let mainWindow: any | null = null;
let tray: any | null = null;
let kasaManager: KasaManager | null = null;
let currentSpeakerStatus: SpeakerPlug[] = [];
let isQuitting = false;

// Create main window
function createWindow(): void {
  // Load icon (try PNG first, fall back to SVG)
  let icon;
  const fs = require('fs');

  // Try multiple possible paths
  const possiblePaths = [
    path.join(__dirname, '../../assets/icon.png'),
    path.join(process.cwd(), 'assets/icon.png'),
    path.join(app.getAppPath(), 'assets/icon.png'),
  ];

  for (const iconPath of possiblePaths) {
    if (!icon && fs.existsSync(iconPath)) {
      try {
        icon = nativeImage.createFromPath(iconPath);
        break;
      } catch (e) {
        // Try next path
      }
    }
  }

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    icon: icon, // Set the app icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    title: 'Kasa Speaker Controller',
    autoHideMenuBar: true, // Hide menu bar (can be toggled with Alt key)
  });

  // Remove the menu bar completely
  Menu.setApplicationMenu(null);

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const htmlPath = path.join(__dirname, '../../renderer/index.html');
    mainWindow.loadFile(htmlPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window close - minimize to tray instead
  mainWindow.on('close', (event: any) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();

      // Pause status polling when hidden to save resources
      if (kasaManager) {
        kasaManager.stopStatusPolling();
        addLog('info', 'App minimized - pausing status updates to save resources');
      }

      if (process.platform === 'win32') {
        showNotification('Kasa Speaker Controller', 'App minimized to system tray');
      }
    }
  });

  // Resume status polling when window is shown
  mainWindow.on('show', () => {
    if (kasaManager && kasaManager.isDeviceConnected()) {
      kasaManager.startStatusPolling();
      addLog('info', 'App restored - resuming status updates');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create system tray
function createTray(): void {
  // Load tray icon - use main icon and resize it
  let trayIcon;
  const fs = require('fs');

  // Try multiple possible paths for tray icon
  const possibleTrayPaths = [
    path.join(__dirname, '../../assets/tray-icon.png'),
    path.join(process.cwd(), 'assets/tray-icon.png'),
    path.join(app.getAppPath(), 'assets/tray-icon.png'),
    // Fallback to main icon if tray-icon doesn't exist
    path.join(__dirname, '../../assets/icon.png'),
    path.join(process.cwd(), 'assets/icon.png'),
    path.join(app.getAppPath(), 'assets/icon.png'),
  ];

  for (const iconPath of possibleTrayPaths) {
    if (!trayIcon && fs.existsSync(iconPath)) {
      try {
        const loadedIcon = nativeImage.createFromPath(iconPath);
        // Resize to appropriate tray size (16x16 for Windows)
        trayIcon = loadedIcon.resize({ width: 16, height: 16 });
        break;
      } catch (e) {
        // Try next path
      }
    }
  }

  if (!trayIcon) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);

  tray.setToolTip('Kasa Speaker Controller');
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

function updateTrayMenu(): void {
  if (!tray) return;

  const statusText = getStatusText();
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Kasa Speaker Controller', enabled: false },
    { type: 'separator' },
    { label: statusText, enabled: false },
    { type: 'separator' },
    {
      label: 'Turn All On',
      click: async () => {
        await kasaManager?.turnOnAll();
      },
    },
    {
      label: 'Turn All Off',
      click: async () => {
        await kasaManager?.turnOffAll();
      },
    },
    { type: 'separator' },
    {
      label: 'Turn Off & Shutdown PC',
      click: async () => {
        await handleShutdownRequest();
      },
    },
    { type: 'separator' },
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function getStatusText(): string {
  if (!kasaManager?.isDeviceConnected()) {
    return 'Status: Disconnected';
  }

  const onCount = currentSpeakerStatus.filter(s => s.status === 'ON').length;
  const totalCount = currentSpeakerStatus.length;

  if (onCount === 0) {
    return 'Status: All speakers OFF';
  } else if (onCount === totalCount) {
    return 'Status: All speakers ON';
  } else {
    return `Status: ${onCount}/${totalCount} speakers ON`;
  }
}

// Initialize Kasa Manager
async function initializeKasaManager(): Promise<void> {
  const config = store.get('config');

  // Get active strip
  if (!config.activeStripId || config.strips.length === 0) {
    addLog('warn', 'No power strip configured. Please configure a strip in settings.');
    return;
  }

  const activeStrip = config.strips.find((s: any) => s.id === config.activeStripId);
  if (!activeStrip) {
    addLog('error', 'Active strip not found in configuration');
    return;
  }

  const plugIndexes = activeStrip.plugs.map((p: any) => p.index);

  kasaManager = new KasaManager(activeStrip.ipAddress, plugIndexes);

  // Set up event listeners
  kasaManager.on('connected', () => {
    addLog('info', `Connected to ${activeStrip.name} (${activeStrip.ipAddress})`);
    mainWindow?.webContents.send('connection-status', true);
    updateTrayMenu();
  });

  kasaManager.on('disconnected', () => {
    addLog('warn', `Disconnected from ${activeStrip.name}`);
    mainWindow?.webContents.send('connection-status', false);
    updateTrayMenu();
  });

  kasaManager.on('statusUpdate', (status: SpeakerPlug[]) => {
    currentSpeakerStatus = status;
    mainWindow?.webContents.send('speaker-status', status);
    updateTrayMenu();
  });

  kasaManager.on('plugStateChanged', (index: number, state: string) => {
    const plug = activeStrip.plugs.find((p: any) => p.index === index);
    const plugName = plug?.name || `Plug ${index}`;
    showNotification('Plug Status Changed', `${plugName} turned ${state}`);
  });

  kasaManager.on('log', (logEntry: LogEntry) => {
    addLog(logEntry.level, logEntry.message);
  });

  kasaManager.on('error', (error: Error) => {
    addLog('error', error.message);
  });

  // Connect to the device
  const connected = await kasaManager.connect();

  if (connected && config.autoOnAtLaunch) {
    addLog('info', 'Auto-on enabled, turning on all plugs...');
    await kasaManager.turnOnAll();
  }
}

function addLog(level: 'info' | 'warn' | 'error', message: string): void {
  const logEntry: LogEntry = {
    timestamp: new Date(),
    level,
    message,
  };

  // Add to store
  const logs = store.get('logs', []);
  logs.push(logEntry);

  // Keep only recent logs based on retention setting
  const config = store.get('config');
  const retentionMs = config.logRetentionDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - retentionMs);
  const filteredLogs = logs.filter(log => new Date(log.timestamp) > cutoffDate);

  store.set('logs', filteredLogs);

  // Send to renderer
  mainWindow?.webContents.send('new-log', logEntry);
}

function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
    }).show();
  }
}

async function handleShutdownRequest(): Promise<void> {
  addLog('info', 'Shutdown requested - turning off speakers...');

  if (kasaManager) {
    await kasaManager.turnOffAll();

    // Wait for grace period to ensure speakers are off
    await new Promise(resolve => setTimeout(resolve, SHUTDOWN_GRACE_PERIOD));
  }

  // Initiate system shutdown
  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    exec('shutdown /s /t 0');
  } else if (process.platform === 'darwin') {
    const { exec } = require('child_process');
    exec('sudo shutdown -h now');
  } else {
    const { exec } = require('child_process');
    exec('shutdown now');
  }
}

// Setup auto-updater
function setupAutoUpdater(): void {
  // Configure auto-updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    addLog('info', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info: any) => {
    addLog('info', `Update available: v${info.version}`);
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', () => {
    addLog('info', 'No updates available');
    mainWindow?.webContents.send('update-not-available');
  });

  autoUpdater.on('download-progress', (progress: any) => {
    mainWindow?.webContents.send('download-progress', {
      bytesPerSecond: progress.bytesPerSecond,
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    addLog('info', 'Update downloaded - ready to install');
    mainWindow?.webContents.send('update-downloaded');

    // Show notification
    showNotification('Update Ready', 'A new version has been downloaded. Restart to install.');
  });

  autoUpdater.on('error', (error: Error) => {
    addLog('error', `Auto-updater error: ${error.message}`);
    mainWindow?.webContents.send('update-error', error.message);
  });

  // Check for updates on startup (with delay to not interfere with app startup)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err: any) => {
      addLog('warn', `Failed to check for updates: ${err.message}`);
    });
  }, 5000);
}

// IPC Handlers
function setupIpcHandlers(): void {
  ipcMain.handle('get-config', () => {
    return store.get('config');
  });

  ipcMain.handle('set-config', async (_: any, config: AppConfig) => {
    const oldConfig = store.get('config');
    store.set('config', config);

    // Update auto-start setting
    app.setLoginItemSettings({
      openAtLogin: config.autoStartEnabled,
    });

    // Check if active strip changed
    const activeStripChanged = oldConfig.activeStripId !== config.activeStripId;

    if (activeStripChanged) {
      // Reconnect to new strip
      addLog('info', 'Active strip changed, reconnecting...');
      if (kasaManager) {
        kasaManager.disconnect();
      }
      await initializeKasaManager();
    } else if (kasaManager && config.activeStripId) {
      // Update existing connection if strip config changed
      const activeStrip = config.strips.find((s: any) => s.id === config.activeStripId);
      if (activeStrip) {
        kasaManager.updateIpAddress(activeStrip.ipAddress);
        kasaManager.updatePlugIndexes(activeStrip.plugs.map((p: any) => p.index));
      }
    }

    addLog('info', 'Configuration updated');
    return true;
  });

  ipcMain.handle('get-logs', () => {
    return store.get('logs', []);
  });

  ipcMain.handle('clear-logs', () => {
    store.set('logs', []);
    addLog('info', 'Logs cleared');
    return true;
  });

  ipcMain.handle('get-speaker-status', async () => {
    if (kasaManager) {
      return await kasaManager.getStatus();
    }
    return [];
  });

  ipcMain.handle('turn-on', async (_: any, plugIndex: number) => {
    if (kasaManager) {
      return await kasaManager.turnOn(plugIndex);
    }
    return false;
  });

  ipcMain.handle('turn-off', async (_: any, plugIndex: number) => {
    if (kasaManager) {
      return await kasaManager.turnOff(plugIndex);
    }
    return false;
  });

  ipcMain.handle('turn-on-all', async () => {
    if (kasaManager) {
      return await kasaManager.turnOnAll();
    }
    return false;
  });

  ipcMain.handle('turn-off-all', async () => {
    if (kasaManager) {
      return await kasaManager.turnOffAll();
    }
    return false;
  });

  ipcMain.handle('reconnect', async () => {
    if (kasaManager) {
      kasaManager.disconnect();
      return await kasaManager.connect();
    }
    return false;
  });

  ipcMain.handle('shutdown-pc', async () => {
    await handleShutdownRequest();
    return true;
  });

  // App info
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Auto-updater handlers
  ipcMain.handle('check-for-updates', async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error: any) {
      addLog('error', `Failed to check for updates: ${error.message}`);
      return { error: error.message };
    }
  });

  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error: any) {
      addLog('error', `Failed to download update: ${error.message}`);
    }
  });

  ipcMain.handle('install-update', () => {
    isQuitting = true;
    autoUpdater.quitAndInstall();
  });
}

// App lifecycle
app.whenReady().then(async () => {
  setupIpcHandlers();

  const config = store.get('config');
  const wasAutoStarted = app.getLoginItemSettings().wasOpenedAtLogin;

  createWindow();
  createTray();

  // Determine if we should start hidden
  // Start hidden if: auto-started OR user preference is to minimize to tray on startup
  const shouldStartHidden = wasAutoStarted || config.minimizeToTrayOnStartup;

  if (shouldStartHidden) {
    mainWindow?.hide();
    if (config.minimizeToTrayOnStartup && !wasAutoStarted) {
      addLog('info', 'Starting minimized to system tray (user preference)');
    } else {
      addLog('info', 'App auto-started - running in system tray');
    }
  }

  await initializeKasaManager();

  // Setup auto-updater (after app is ready)
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep running in background on all platforms
  // Don't quit the app
});

app.on('before-quit', async (event: any) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;

    const config = store.get('config');

    // Only turn off speakers if auto-off on shutdown is enabled
    if (config.autoOffOnShutdown && kasaManager) {
      addLog('info', 'Application shutting down - turning off speakers...');
      await kasaManager.shutdownSpeakers();
    } else {
      addLog('info', 'Application shutting down...');
      if (kasaManager) {
        kasaManager.disconnect();
      }
    }

    // Short delay to ensure everything completes
    setTimeout(() => {
      app.quit();
    }, 1000);
  }
});
