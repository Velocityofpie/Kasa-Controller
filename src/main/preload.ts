// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron');
import { AppConfig, LogEntry, SpeakerPlug, UpdateInfo, UpdateProgress } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
  setConfig: (config: AppConfig): Promise<boolean> => ipcRenderer.invoke('set-config', config),

  // Logs
  getLogs: (): Promise<LogEntry[]> => ipcRenderer.invoke('get-logs'),
  clearLogs: (): Promise<boolean> => ipcRenderer.invoke('clear-logs'),
  onNewLog: (callback: (log: LogEntry) => void) => {
    ipcRenderer.on('new-log', (_: any, log: any) => callback(log));
  },

  // Speaker control
  getSpeakerStatus: (): Promise<SpeakerPlug[]> => ipcRenderer.invoke('get-speaker-status'),
  turnOn: (plugIndex: number): Promise<boolean> => ipcRenderer.invoke('turn-on', plugIndex),
  turnOff: (plugIndex: number): Promise<boolean> => ipcRenderer.invoke('turn-off', plugIndex),
  turnOnAll: (): Promise<boolean> => ipcRenderer.invoke('turn-on-all'),
  turnOffAll: (): Promise<boolean> => ipcRenderer.invoke('turn-off-all'),
  reconnect: (): Promise<boolean> => ipcRenderer.invoke('reconnect'),
  shutdownPC: (): Promise<boolean> => ipcRenderer.invoke('shutdown-pc'),

  // Events
  onConnectionStatus: (callback: (connected: boolean) => void) => {
    ipcRenderer.on('connection-status', (_: any, connected: any) => callback(connected));
  },
  onSpeakerStatus: (callback: (status: SpeakerPlug[]) => void) => {
    ipcRenderer.on('speaker-status', (_: any, status: any) => callback(status));
  },

  // App info
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),

  // Auto-updater
  checkForUpdates: (): Promise<any> => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (): Promise<void> => ipcRenderer.invoke('download-update'),
  installUpdate: (): void => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    ipcRenderer.on('update-available', (_: any, info: any) => callback(info));
  },
  onUpdateNotAvailable: (callback: () => void) => {
    ipcRenderer.on('update-not-available', () => callback());
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', () => callback());
  },
  onDownloadProgress: (callback: (progress: UpdateProgress) => void) => {
    ipcRenderer.on('download-progress', (_: any, progress: any) => callback(progress));
  },
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.on('update-error', (_: any, error: any) => callback(error));
  },
});

// TypeScript type definition for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<AppConfig>;
      setConfig: (config: AppConfig) => Promise<boolean>;
      getLogs: () => Promise<LogEntry[]>;
      clearLogs: () => Promise<boolean>;
      onNewLog: (callback: (log: LogEntry) => void) => void;
      getSpeakerStatus: () => Promise<SpeakerPlug[]>;
      turnOn: (plugIndex: number) => Promise<boolean>;
      turnOff: (plugIndex: number) => Promise<boolean>;
      turnOnAll: () => Promise<boolean>;
      turnOffAll: () => Promise<boolean>;
      reconnect: () => Promise<boolean>;
      shutdownPC: () => Promise<boolean>;
      onConnectionStatus: (callback: (connected: boolean) => void) => void;
      onSpeakerStatus: (callback: (status: SpeakerPlug[]) => void) => void;
      // App info
      getAppVersion: () => Promise<string>;
      // Auto-updater
      checkForUpdates: () => Promise<any>;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => void;
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
      onUpdateNotAvailable: (callback: () => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      onDownloadProgress: (callback: (progress: UpdateProgress) => void) => void;
      onUpdateError: (callback: (error: string) => void) => void;
    };
  }
}
