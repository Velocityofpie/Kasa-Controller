// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron');
import { AppConfig, LogEntry, SpeakerPlug } from '../shared/types';

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
    };
  }
}
