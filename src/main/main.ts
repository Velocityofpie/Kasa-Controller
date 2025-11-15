// @ts-ignore - Use bare require for electron
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } = require('electron');
import * as path from 'path';
import Store from 'electron-store';
import { KasaManager } from './kasaManager';
import { AppConfig, LogEntry, SpeakerPlug } from '../shared/types';
import { DEFAULT_CONFIG, SHUTDOWN_GRACE_PERIOD } from '../shared/constants';

// Store for persisting app configuration
const store = new Store<{ config: AppConfig; logs: LogEntry[] }>({
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
}

// App lifecycle
app.whenReady().then(async () => {
  setupIpcHandlers();
  createWindow();
  createTray();
  await initializeKasaManager();

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

    addLog('info', 'Application shutting down - turning off speakers...');

    if (kasaManager) {
      await kasaManager.turnOffAll();
      kasaManager.disconnect();
    }

    // Short delay to ensure everything completes
    setTimeout(() => {
      app.quit();
    }, 1000);
  }
});
